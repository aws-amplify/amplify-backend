import { executeCDKCommand } from '../execute-cdk-command';
import * as fs from 'fs-extra';
import { envNamePositional, profileNameOption, strictCommand } from './command-components';

export const getCommand = () =>
  strictCommand('watch')
    .description('Watch and immediately push local project changes')
    .addArgument(envNamePositional)
    .addOption(profileNameOption)
    .action(watchHandler);

type Args = [string];
type Opts = {
  profile?: string;
};
// wrapper around CDK watch
const watchHandler = async (...[envName, { profile }]: [...Args, Opts]) => {
  fs.writeFileSync('cdk.json', JSON.stringify({ watch: {} }));
  process.on('exit', () => fs.unlinkSync('cdk.json'));
  process.on('SIGINT', () => fs.unlinkSync('cdk.json'));

  const cdkArgs = ['watch', '--all', '--app', `nxt synth ${envName}`, '--require-approval', 'never', '--concurrency', '5'];

  if (profile) {
    cdkArgs.push('--profile', profile);
  }

  await executeCDKCommand(...cdkArgs);
};
