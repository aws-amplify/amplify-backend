import { Command, createArgument, createCommand, createOption } from "commander";
import { executeCDKCommand } from "../execute-cdk-command";

export const getCommand = (): Command => {
  return createCommand("push")
    .description("Deploy an Amplify project to a specific environment")
    .argument("env", "The cloud environment to which the project will be deployed")
    .action(pushHandler);
};

/**
 * Performs a synth, then executes cdk deploy on the resulting CloudAssembly
 * @param env
 * @param options
 */
const pushHandler = async (env: string, options: any) => {
  await executeCDKCommand("deploy");
  console.log(`got env: ${env}`);
  console.log(`got options ${JSON.stringify(options)}`);
  // pull frontend config
};
