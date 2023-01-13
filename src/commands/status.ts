import { Command, createCommand } from "commander";

export const getCommand = (): Command => {
  return createCommand("status")
    .description("Display differences between local project config and deployed project state")
    .option("-f, --file <relative path>", "The relative location of the Amplify manifest file")
    .action(statusHandler);
};

/**
 * Wrapper around cdk diff
 * @param env
 * @param options
 */
const statusHandler = (env: string, options: any) => {
  console.log(`got env: ${env}`);
  console.log(`got options ${JSON.stringify(options)}`);
  // pull frontend config
};
