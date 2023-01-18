import { Command, createCommand } from "commander";
import { executeCDKCommand } from "../execute-cdk-command";

export const getCommand = (): Command => {
  return createCommand("status")
    .description("Display differences between local project config and deployed project state")
    .argument("env", "The cloud environment to which the project will be deployed")
    .action(statusHandler);
};

/**
 * Wrapper around cdk diff
 * @param env
 * @param options
 */
const statusHandler = async (env: string, options: any) => {
  await executeCDKCommand("diff", "--app", `nxt synth ${env}`);
};
