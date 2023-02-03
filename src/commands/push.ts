import { Command } from '@commander-js/extra-typings';
import { executeCDKCommand } from '../execute-cdk-command';
import { envNamePositional, profileNameOption, strictCommand } from './command-components';

type Args = [string];
type Opts = {
  profile?: string;
};
export const getCommand = (): Command<Args, Opts> =>
  strictCommand('push')
    .description('Push the specified environment to the cloud')
    .addArgument(envNamePositional)
    .addOption(profileNameOption)
    .action(pushHandler);

/**
 * Performs a synth, then executes cdk deploy on the resulting CloudAssembly
 * @param env
 * @param options
 */
const pushHandler = async (...[env, { profile }]: [...Args, Opts]) => {
  const cdkArgs = ['deploy', '--app', `nxt synth ${env}`, '--all', '--require-approval', 'never', '--concurrency', '5'];
  if (profile) {
    cdkArgs.push('--profile', profile);
  }
  await executeCDKCommand(...cdkArgs);
};
