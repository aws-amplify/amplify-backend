import { Command, createCommand } from "commander";

export const getCommand = (): Command => {
  return createCommand("watch")
    .description("Immediately push local project changes when detected. ")
    .argument("env", "The cloud environment to which changes will be deployed")
    .action(watchHandler);
};

/**
 * Wrapper around cdk synth
 * @param env
 * @param options
 */
const watchHandler = async (env: string, options: any) => {
  console.log(`got env: ${env}`);
  console.log(`got options ${JSON.stringify(options)}`);
  // pull frontend config
};
