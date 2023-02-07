import { createOption } from '@commander-js/extra-typings';
import { AmplifyCommand, envNamePositional } from './command-components';
import { SSM } from 'aws-sdk';
import { AmplifyParameters } from '../stubs/amplify-parameters';

export const getCommand = () => {
  const nameOption = createOption('-n, --name <paramName...>', 'The name of the parameter to modify').makeOptionMandatory(true);
  const secretOption = createOption(
    '-s, --is-secret',
    'This value is a secret. Indicates that it should never be fetched on the client or printed'
  ).default(false);
  const setParamsCommand = AmplifyCommand.create('set')
    .description('Set a parameter in a specified environment')
    .withCredentialHandler()
    .addArgument(envNamePositional)
    .addOption(nameOption)
    .requiredOption('-v, --value <value...>', 'The parameter value to set. Any existing value will be overwritten')
    .addOption(secretOption)
    .action(setCommandHandler);

  const removeParamsCommand = AmplifyCommand.create('remove')
    .description('Remove a parameter in a given environment')
    .withCredentialHandler()
    .addArgument(envNamePositional)
    .addOption(nameOption)
    .action(removeCommandHandler);

  const listParamsCommand = AmplifyCommand.create('list')
    .description('List all parameters and values in the given environment')
    .withCredentialHandler()
    .addArgument(envNamePositional)
    .action(listCommandHandler);

  return AmplifyCommand.create('param')
    .description('Manage environment parameters')
    .addCommand(setParamsCommand)
    .addCommand(removeParamsCommand)
    .addCommand(listParamsCommand);
};

type Args = [string];
type Opts = {
  name: string[];
  value: string[];
  isSecret: boolean;
};

const setCommandHandler = async (...[envName, { name: names, value: values, isSecret }]: [...Args, Opts]) => {
  if (names.length !== values.length) {
    throw new Error('Must specify the same number of names and values');
  }
  const amplifyParameters = new AmplifyParameters(new SSM(), envName);
  for (const [idx, name] of names.entries()) {
    await amplifyParameters.putParameter(name, values[idx], isSecret);
    console.log(`Set param ${name} to ${isSecret ? '****' : values[idx]} in ${envName}`);
  }
};

const removeCommandHandler = async (...[envName, { name: names }]: [...Args, Pick<Opts, 'name'>]) => {
  const amplifyParameters = new AmplifyParameters(new SSM(), envName);
  for (const name of names) {
    await amplifyParameters.removeParameter(name);
    console.log(`Removed param ${name} in ${envName}`);
  }
};

const listCommandHandler = async (envName: string) => {
  (await new AmplifyParameters(new SSM(), envName).listParameters()).forEach((param) => {
    if (param.isSecret) {
      console.log(`${param.name}: <secret>`);
    } else {
      console.log(`${param.name}: ${param.value}`);
    }
  });
};
