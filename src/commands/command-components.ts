import { Command, createArgument, createCommand, createOption } from '@commander-js/extra-typings';
import { configureProfile } from '../configure-profile';

export const envNamePositional = createArgument('<envName>', 'The environment on which to perform the operation');

export const profileNameOption = createOption('-p, --profile <profile>', 'The AWs profile to use for credentials');

export class AmplifyCommand extends Command {
  private constructor(name: string) {
    super(name);
    this.allowExcessArguments(false).allowUnknownOption(false);
  }

  static create(name: string) {
    return new AmplifyCommand(name);
  }

  withCredentialHandler() {
    this.addOption(profileNameOption);
    this.hook('preAction', (_, actionCommand) => {
      configureProfile(actionCommand.opts()?.profile as string | undefined);
    });
    return this;
  }
}
