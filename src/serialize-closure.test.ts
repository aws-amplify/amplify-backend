import { serializeFunction } from '@pulumi/pulumi/runtime/closure/serializeClosure';
import { randomUUID } from 'crypto';
import { S3 } from 'aws-sdk';
import { z } from 'zod';
import esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs-extra';

const testFunc = async () => {
  console.log(`this is a ${randomUUID()} and ${anotherFunc()}`);
  const s3Client = new S3();
  const zodSchema = z.object({
    hello: z.string(),
  });
  zodSchema.parse({ world: 'fails' });
  await s3Client.putObject().promise();
  console.log(process.env.INFOPATH);
};

const anotherFunc = () => {
  return 'this is a string';
};

it('testing', async () => {
  const serialized = await serializeFunction(testFunc);
  const testPath = path.resolve(__dirname, 'test-bundle.js');
  const outFile = path.join(__dirname, 'serialized-modules.js');
  fs.writeFile(testPath, serialized.text);
  await esbuild.build({
    entryPoints: [testPath],
    outfile: outFile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['aws-sdk'],
    strict: false,
  });
});
