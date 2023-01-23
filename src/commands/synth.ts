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
 * @param options
 */
const synthHandler = async (env: string, options: any) => {
  // const tokenizedManifest = JSON.parse(await fs.readFile("manifest.amplify.json", "utf8"));
  const tokenizedManifest = parse(await fs.readFile('manifest.amplify.yml', 'utf8'));

  // Note the CDK app is constructed outside of the AmplifyTransform. The AmplifyTransform is a CDK construct that is portabe to any CDK App
  const app = new App({ outdir: 'cdk.out' });
  const amplifyTransform = await createTransformerOrchestrator(app, env, tokenizedManifest);
  amplifyTransform.transform();
  app.synth();
};
