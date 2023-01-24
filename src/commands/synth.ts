import { App } from 'aws-cdk-lib';
import { Command, createCommand } from 'commander';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import { createTransformerOrchestrator } from '../transformer/transformer-factory';

export const getCommand = (): Command => {
  return createCommand('synth')
    .description("Synthesize the deployment artifacts for an Amplify project but don't deploy them")
    .argument('env', 'The cloud environment to which the project will be deployed')
    .action(synthHandler);
};

/**
 * Wrapper around cdk synth
 * @param env
 */
const synthHandler = async (env: string) => {
  const tokenizedManifest = parse(await fs.readFile('manifest.amplify.yml', 'utf8'));

  const amplifyTransform = await createTransformerOrchestrator(env, tokenizedManifest);

  const app = new App();
  // the AmplifyTransform operates on a CDK app created externally
  // this means it can seamlessly be plugged into an existing CDK app
  amplifyTransform.transform(app);
  app.synth();
};
