import { executeCDKCommand } from '../execute-cdk-command';
import { AmplifyCommand, envNamePositional } from './command-components';

export const getCommand = () =>
  AmplifyCommand.create('status')
    .description('Display differences between local project config and deployed project state')
    .addArgument(envNamePositional)
    .action(statusHandler);

/**
 * Wrapper around cdk diff
 * @param env
 * @param options
 */
const statusHandler = async (env: string) => {
  await executeCDKCommand('diff', '--app', `nxt synth ${env}`);
};
