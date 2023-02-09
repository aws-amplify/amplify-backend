import { Command } from '@commander-js/extra-typings';
import { envNamePositional, CredentialedCommandBase } from './command-components';

type Args = [string];
type Opts = {
  language: string[];
  output?: string;
};

class LinkCommand extends CredentialedCommandBase {
  constructor() {
    super();
    this.name('link')
      .description('Generate local files to connect a frontend to an Amplify backend')
      .addArgument(envNamePositional)
      .requiredOption('-l, --language <languages...>', 'Target languages for which to generate frontend config')
      .option('-o, --output <path>', 'Location where output artifacts will be written')
      .action(this.handler);
  }

  private handler = async (...[env, { language, output = 'default/path' }]: [...Args, Opts]) => {
    console.log(`Generating frontend config and codegen for env ${env}, languages ${JSON.stringify(language)} and location ${output}`);
  };
}

export const getCommand = (): Command => new LinkCommand();
