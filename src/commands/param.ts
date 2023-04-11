import { StrictCommand, envNamePositional, CredentialedCommandBase, nameOption, secretOption } from './shared-components';
import { AmplifyParameters } from '../stubs/amplify-parameters';

type Args = [string];
type Opts = {
  name: string[];
  value: string[];
  isSecret: boolean;
};

class SetParamCommand extends CredentialedCommandBase {
  constructor() {
    super();
    this.name('set')
      .description('Set a parameter in a specified environment')
      .addArgument(envNamePositional)
      .addOption(nameOption)
      .requiredOption('-v, --value <value...>', 'The parameter value to set. Any existing value will be overwritten')
      .addOption(secretOption)
      .action(this.handler);
  }

  private handler = async (...[envName, { name: names, value: values, isSecret }]: [...Args, Opts]) => {
    if (names.length !== values.length) {
      throw new Error('Must specify the same number of names and values');
    }
    const amplifyParameters = new AmplifyParameters(new this.sdk.SSM(), envName);
    for (const [idx, name] of names.entries()) {
      await amplifyParameters.putParameter(name, values[idx], isSecret);
      console.log(`Set param ${name} to ${isSecret ? '****' : values[idx]} in ${envName}`);
    }
  };
}

class RemoveParamCommand extends CredentialedCommandBase {
  constructor() {
    super();
    this.name('remove')
      .description('Remove a parameter in a given environment')
      .addArgument(envNamePositional)
      .addOption(nameOption)
      .action(this.handler);
  }

  private handler = async (...[envName, { name: names }]: [...Args, Pick<Opts, 'name'>]) => {
    const amplifyParameters = new AmplifyParameters(new this.sdk.SSM(), envName);
    for (const name of names) {
      await amplifyParameters.removeParameter(name);
      console.log(`Removed param ${name} in ${envName}`);
    }
  };
}

class ListParamCommand extends CredentialedCommandBase {
  constructor() {
    super();
    this.name('list').description('List all parameters and values in the given environment').addArgument(envNamePositional).action(this.handler);
  }
  private handler = async (envName: string) => {
    const amplifyParameters = new AmplifyParameters(new this.sdk.SSM(), envName);
    (await amplifyParameters.listParameters()).forEach((param) => {
      if (param.isSecret) {
        console.log(`${param.name}: <secret>`);
      } else {
        console.log(`${param.name}: ${param.value}`);
      }
    });
  };
}

export const getCommand = () => {
  return new StrictCommand('param')
    .description('Manage environment parameters')
    .addCommand(new SetParamCommand())
    .addCommand(new RemoveParamCommand())
    .addCommand(new ListParamCommand());
};
