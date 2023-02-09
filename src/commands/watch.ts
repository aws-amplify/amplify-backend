import { executeCDKCommand } from '../execute-cdk-command';
import * as fs from 'fs-extra';
import { envNamePositional, profileNameOption, AmplifyCommandBase } from './command-components';

type Args = [string];
type Opts = {
  profile?: string;
};

class WatchCommand extends AmplifyCommandBase {
  constructor() {
    super();
    this.name('watch')
      .description('Watch and immediately push local project changes')
      .addArgument(envNamePositional)
      .addOption(profileNameOption)
      .action(this.handler);
  }

  private handler = async (...[envName, { profile }]: [...Args, Opts]) => {
    fs.writeFileSync('cdk.json', JSON.stringify({ watch: {} }));
    process.on('exit', () => fs.unlinkSync('cdk.json'));
    process.on('SIGINT', () => fs.unlinkSync('cdk.json'));

    const cdkArgs = ['watch', '--all', '--app', `nxt synth ${envName}`, '--require-approval', 'never', '--concurrency', '5'];

    if (profile) {
      cdkArgs.push('--profile', profile);
    }

    await executeCDKCommand(...cdkArgs);
  };
}
export const getCommand = () => new WatchCommand();
