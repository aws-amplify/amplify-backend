import { createHash } from 'crypto';
import path from 'path';
import { AmplifyBuilderBase } from './amplify-builder-base';
import { serializeFunction } from '@pulumi/pulumi/runtime';
import * as fs from 'fs-extra';
import { build } from 'esbuild';
import { FunctionConfig } from '../providers/lambda/lambda-provider';

export type IAmplifyFunction = AmplifyBuilderBase<FunctionConfig, never, 'runtime', 'invoke'>;

class AmplifyFunction extends AmplifyBuilderBase<FunctionConfig, never, 'runtime', 'invoke'> {
  constructor(config: FunctionConfig) {
    super('@aws-amplify/function-adaptor', config);
  }

  static fromAsync = async (func: Function): Promise<AmplifyFunction> => {
    // serialize the function closure
    const serialized = await serializeFunction(func);
    const funcHash = createHash('md5').update(serialized.text).digest('base64');
    const tempFile = path.resolve(process.cwd(), 'temp-build.js');
    const bundlePath = path.join(process.cwd(), '.build', funcHash);
    const bundleNameBase = 'lambda-bundle';
    const bundleFile = path.join(bundlePath, `${bundleNameBase}.js`);
    await fs.writeFile(tempFile, serialized.text);
    await build({
      entryPoints: [tempFile],
      outfile: bundleFile,
      bundle: true,
      format: 'cjs',
      platform: 'node',
      external: ['aws-sdk'],
    });
    // esbuild places 'use strict' on the first line of the file which is incompatible with the serialized function
    const bundleContent = await fs.readFile(bundleFile, 'utf-8');
    const lines = bundleContent.split('\n');
    lines.shift();
    await fs.writeFile(bundleFile, lines.join('\n'), 'utf-8');

    // remove the temp file
    await fs.unlink(tempFile);
    return new AmplifyFunction({
      handler: `${bundleNameBase}.${serialized.exportName}`,
      runtime: 'nodejs18.x',
      codePath: bundlePath,
    });
  };
}

export const AFunction = (config: FunctionConfig) => new AmplifyFunction(config);

export const InlineFunction = (callback: Function) => AmplifyFunction.fromAsync(callback);
