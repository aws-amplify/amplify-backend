import { App } from 'aws-cdk-lib';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import { createTransformer } from '../transformer/transformer-factory';
import { amplifyManifest } from '../manifest/manifest-schema';
import { AmplifyCommand, envNamePositional } from './command-components';

export const getCommand = () =>
  AmplifyCommand.create('synth')
    .description("Synthesize the deployment artifacts for an Amplify project but don't deploy them")
    .addArgument(envNamePositional)
    .action(synthHandler);

/**
 * Wrapper around cdk synth
 * @param env
 */
const synthHandler = async (env: string) => {
  const tokenizedManifest = amplifyManifest.parse(parse(await fs.readFile('manifest.amplify.yml', 'utf8')));

  const amplifyTransform = await createTransformer(env, tokenizedManifest);

  const app = new App({ outdir: 'cdk.out' });
  // the AmplifyTransform operates on a CDK app created externally
  // this means it can seamlessly be plugged into an existing CDK app
  amplifyTransform.transform(app);
  app.synth();
};
