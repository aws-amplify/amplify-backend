import { App } from 'aws-cdk-lib';
import { parse } from 'yaml';
import * as fs from 'fs-extra';
import { createTransformer } from '../transformer/transformer-factory';
import { envNamePositional, AmplifyCommandBase } from './command-components';
import { projectConfig } from '../manifest/ir-definition';

class SynthCommand extends AmplifyCommandBase {
  constructor() {
    super();
    this.name('synth')
      .description("Synthesize the deployment artifacts for an Amplify project but don't deploy them")
      .addArgument(envNamePositional)
      .action(this.handler);
  }

  private handler = async (envName: string) => {
    const config = projectConfig.parse(parse(await fs.readFile('manifest.amplify.yml', 'utf8')));

    const amplifyTransform = await createTransformer(envName, config.constructMap);

    const app = new App({ outdir: 'cdk.out' });
    // the AmplifyTransform operates on a CDK app created externally
    // this means it can seamlessly be plugged into an existing CDK app
    amplifyTransform.transform(app);
    app.synth();
  };
}

export const getCommand = () => new SynthCommand();
