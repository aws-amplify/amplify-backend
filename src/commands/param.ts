import { createOption } from '@commander-js/extra-typings';
import { envNamePositional, strictCommand } from './command-components';

export const getCommand = () => {
  const nameOption = createOption('-n, --name <paramName>', 'The name of the parameter to modify').makeOptionMandatory(true);

  const setParamsCommand = strictCommand('set')
    .description('Set a parameter in a specified environment')
    .addArgument(envNamePositional)
    .addOption(nameOption)
    .requiredOption('-v, --value <value>', 'The parameter value to set. Any existing value will be overwritten')
    .action(setCommandHandler);

  const removeParamsCommand = strictCommand('remove')
    .description('Remove a parameter in a given environment')
    .addArgument(envNamePositional)
    .addOption(nameOption)
    .action(removeCommandHandler);

  return strictCommand('params').description('Manage environment parameters').addCommand(setParamsCommand).addCommand(removeParamsCommand);
};

type Args = [string];
type Opts = {
  name: string;
  value: string;
};

const setCommandHandler = async (...[envName, { name, value }]: [...Args, Opts]) => {
  console.log(`setting param ${name} to ${value} in ${envName}`);
  // set value in parameter store
};

const removeCommandHandler = async (...[envName, { name }]: [...Args, Omit<Opts, 'value'>]) => {
  console.log(`removing param ${name} in ${envName}`);
};
