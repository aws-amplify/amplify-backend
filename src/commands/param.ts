import { Command, createOption } from '@commander-js/extra-typings';
import { AmplifyCommand, envNamePositional, profileNameOption } from './command-components';
import aws, { SSM } from 'aws-sdk';
import { configureProfile } from '../configure-profile';

export const getCommand = () => {
  const nameOption = createOption('-n, --name <paramName>', 'The name of the parameter to modify').makeOptionMandatory(true);
  const secretOption = createOption(
    '-s, --is-secret',
    'This value is a secret. Indicates that it should never be fetched on the client or printed'
  ).default(false);
  const setParamsCommand = AmplifyCommand.create('set')
    .description('Set a parameter in a specified environment')
    .withCredentialHandler()
    .addArgument(envNamePositional)
    .addOption(nameOption)
    .requiredOption('-v, --value <value>', 'The parameter value to set. Any existing value will be overwritten')
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
  name: string;
  value: string;
  isSecret: boolean;
};

const setCommandHandler = async (...[envName, { name, value, isSecret }]: [...Args, Opts]) => {
  const ssmClient = new SSM();
  await ssmClient
    .putParameter({
      Name: paramName(envName, name),
      Value: value,
      Type: isSecret ? 'SecureString' : 'String',
    })
    .promise();

  console.log(`Set param ${name} to ${value} in ${envName}`);
};

const removeCommandHandler = async (...[envName, { name }]: [...Args, Pick<Opts, 'name'>]) => {
  const ssmClient = new SSM();
  await ssmClient
    .deleteParameter({
      Name: paramName(envName, name),
    })
    .promise();
  console.log(`Removed param ${name} in ${envName}`);
};

const listCommandHandler = async (envName: string) => {
  const ssmClient = new SSM();
  // TODO would need to paginate here
  const params = await ssmClient
    .getParametersByPath({
      Path: envPath(envName),
      WithDecryption: false,
      MaxResults: 10,
    })
    .promise();
  params.Parameters?.forEach((param) => {
    const paramName = param.Name?.slice(param.Name.lastIndexOf('/') + 1);
    if (param.Type === 'String') {
      console.log(`${paramName}: ${param.Value}`);
    } else if (param.Type === 'SecureString') {
      console.log(`${paramName}: <secret>`);
    }
  });
};

const paramName = (envName: string, paramName: string) => `${envPath(envName)}/${paramName}`;
const envPath = (envName: string) => `/amp/${envName}`;
