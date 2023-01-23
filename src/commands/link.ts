import { Command, createArgument, createCommand, createOption } from 'commander';

export const getCommand = (): Command => {
  return createCommand('link')
    .description('Generate local files to connect a frontend to an Amplify backend')
    .argument('<env>', 'The cloud environment to which the frontend will be linked')
    .requiredOption('-l, --language <languages...>', 'Target languages for which to generate frontend config')
    .option('-o, --output', 'Location where output artifacts will be written')
    .action(linkHandler);
};

/**
 * Pull frontend config, perform or pull codegen artifacts
 * @param env
 * @param options
 */
const linkHandler = (env: string, options: any) => {
  console.log(`got env: ${env}`);
  console.log(`got options ${JSON.stringify(options)}`);
};
