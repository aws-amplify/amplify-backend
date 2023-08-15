import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { LocalProjectNameResolver } from '../../local_project_name_resolver.js';
import { ClientConfigWriter } from '@aws-amplify/client-config';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const configWriter = new ClientConfigWriter();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider,
    configWriter
  );
  const localProjectNameResolver = new LocalProjectNameResolver();

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGenerator,
    localProjectNameResolver,
    configWriter
  );

  const generateFormsCommand = new GenerateFormsCommand(
    clientConfigGenerator,
    localProjectNameResolver
  );

  return new GenerateCommand(generateConfigCommand, generateFormsCommand);
};
