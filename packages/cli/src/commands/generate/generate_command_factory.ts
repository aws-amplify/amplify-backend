import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from '@aws-amplify/client-config';
import { ClientConfigWriter } from './config/client_config_writer.js';
import { LocalProjectNameResolver } from '../../local_project_name_resolver.js';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const clientConfigWriter = new ClientConfigWriter();
  const localProjectNameResolver = new LocalProjectNameResolver();

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGenerator,
    clientConfigWriter,
    localProjectNameResolver
  );

  return new GenerateCommand(generateConfigCommand);
};
