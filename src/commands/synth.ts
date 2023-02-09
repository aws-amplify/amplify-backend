import { App } from 'aws-cdk-lib';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import { createTransformer } from '../transformer/transformer-factory';
import { amplifyManifest } from '../manifest/manifest-schema';
import { envNamePositional, CredentialedCommandBase } from './command-components';
import { AmplifyParameters } from '../stubs/amplify-parameters';

class SynthCommand extends CredentialedCommandBase {
  constructor() {
    super();
    this.name('synth')
      .description("Synthesize the deployment artifacts for an Amplify project but don't deploy them")
      .addArgument(envNamePositional)
      .action(this.handler);
  }

  private handler = async (envName: string) => {
    const tokenizedManifest = amplifyManifest.parse(parse(await fs.readFile('manifest.amplify.yml', 'utf8')));

    const amplifyTransform = await createTransformer(envName, new AmplifyParameters(new this.sdk.SSM(), envName), tokenizedManifest);

    const app = new App({ outdir: 'cdk.out' });
    // the AmplifyTransform operates on a CDK app created externally
    // this means it can seamlessly be plugged into an existing CDK app
    amplifyTransform.transform(app);
    app.synth();
  };
}

export const getCommand = () => new SynthCommand();
