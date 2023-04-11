import { executeCDKCommand } from '../execute-cdk-command';
import { envNamePositional, AmplifyCommandBase, profileNameOption } from './command-components';

type Opts = {
  profile?: string;
};

class StatusCommand extends AmplifyCommandBase {
  constructor() {
    super();
    this.name('status')
      .description('Display differences between local project config and deployed project state')
      .addArgument(envNamePositional)
      .addOption(profileNameOption)
      .action(this.handler);
  }

  private handler = async (env: string, { profile }: Opts) => {
    await executeCDKCommand('diff', '--app', `vnext synth ${env}`);
  };
}
export const getCommand = () => new StatusCommand();
