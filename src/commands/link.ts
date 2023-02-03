import { Command } from '@commander-js/extra-typings';
import { envNamePositional, strictCommand } from './command-components';

type Args = [string];
type Opts = {
  language: string[];
  output?: string;
};

export const getCommand = (): Command<Args, Opts> =>
  strictCommand('link')
    .description('Generate local files to connect a frontend to an Amplify backend')
    .addArgument(envNamePositional)
    .requiredOption('-l, --language <languages...>', 'Target languages for which to generate frontend config')
    .option('-o, --output <path>', 'Location where output artifacts will be written')
    .action(linkHandler);

/**
 * Pull frontend config, perform or pull codegen artifacts
 * @param env
 * @param options
 */
const linkHandler = (...[env, { language, output = 'default/path' }]: [...Args, Opts]) => {
  console.log(`Generating frontend config and codegen for env ${env}, languages ${JSON.stringify(language)} and location ${output}`);
};
