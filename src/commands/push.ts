import { executeCDKCommand } from '../execute-cdk-command';
import { envNamePositional, profileNameOption, AmplifyCommandBase } from './command-components';

type Args = [string];
type Opts = {
  profile?: string;
};

class PushCommand extends AmplifyCommandBase {
  constructor() {
    super();
    this.name('push')
      .description('Push the specified environment to the cloud')
      .addArgument(envNamePositional)
      .addOption(profileNameOption)
      .action(this.handler);
  }

  private handler = async (...[env, { profile }]: [...Args, Opts]) => {
    const cdkArgs = ['deploy', '--app', `nxt synth ${env}`, '--all', '--require-approval', 'never', '--concurrency', '5'];
    if (profile) {
      cdkArgs.push('--profile', profile);
    }
    await executeCDKCommand(...cdkArgs);
  };
}

export const getCommand = () => new PushCommand();
