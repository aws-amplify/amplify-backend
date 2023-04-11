import { App } from 'aws-cdk-lib';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import { createTransformer } from '../transformer/transformer-factory';
import { envNamePositional, AmplifyCommandBase } from './shared-components';
import { ConstructMap, ProjectConfig, projectConfig } from '../input-definitions/ir-definition';
import { createOption } from '@commander-js/extra-typings';
import path from 'path';
import { BuildResult, buildResult } from '../input-definitions/amplify-builder-base';

class SynthCommand extends AmplifyCommandBase {
  constructor() {
    super();
    this.name('synth')
      .description("Synthesize the deployment artifacts for an Amplify project but don't deploy them")
      .addArgument(envNamePositional)
      .addOption(createOption('--from-declarative', 'If true, project definition will be read from amplify.yml instead of amplify.ts'))
      .action(this.handler);
  }

  private handler = async (envName: string, { fromDeclarative }: { fromDeclarative?: boolean }) => {
    const config = fromDeclarative ? await declarativeConfigLoader() : await imperativeConfigLoader();

    console.log(JSON.stringify(config, undefined, 2));

    const amplifyTransform = await createTransformer(envName, config.constructMap);

    const app = new App({ outdir: 'cdk.out' });
    // the AmplifyTransform operates on a CDK app created externally
    // this means it can seamlessly be plugged into an existing CDK app
    amplifyTransform.transform(app);
    app.synth();
  };
}

const declarativeConfigLoader = async (): Promise<ProjectConfig> => {
  return projectConfig.parse(parse(await fs.readFile('amplify.yml', 'utf8')));
};

const imperativeConfigLoader = async (): Promise<ProjectConfig> => {
  const constructMap: ConstructMap = {};
  const idToNameMap: Record<string, string> = {};
  // TODO hardcoding this path for now but we should have a standard place we expect to find it
  const def = (await import(path.resolve(process.cwd(), 'lib', 'example-project', 'amplify.js'))) as Record<'default', unknown>;
  for (const [constructName, constructBuilder] of Object.entries(def.default || {})) {
    const builder = getConstructBuilderFunction(constructName, constructBuilder);
    const result = buildResult.parse(await builder());
    constructMap[constructName] = result.config;
    idToNameMap[result.id] = constructName;
    Object.entries(result.inlineConstructs).forEach(([name, config]) => {
      constructMap[name] = config.config;
      idToNameMap[config.id] = name;
    });
  }
  // quick and dirty hack to replace all ids with their corresponding name in the constructMap object
  let constructMapString = JSON.stringify(constructMap);
  Object.entries(idToNameMap).forEach(([id, name]) => {
    constructMapString = constructMapString.replace(new RegExp(id, 'g'), name);
  });
  return {
    constructMap: JSON.parse(constructMapString),
  };
};

const getConstructBuilderFunction = (constructName: string, constructBuilder: unknown): (() => Promise<BuildResult>) => {
  if (typeof constructBuilder !== 'object') {
    throw new Error(`${constructName} is not an object`);
  }
  if (constructBuilder === null) {
    throw new Error(`${constructName} is null`);
  }
  if (!('_build' in constructBuilder)) {
    throw new Error(`${constructName} does not have a _build member`);
  }
  if (typeof constructBuilder._build !== 'function') {
    throw new Error(`${constructName} _build member is not a function`);
  }
  return constructBuilder._build.bind(constructBuilder);
};

export const getCommand = () => new SynthCommand();
