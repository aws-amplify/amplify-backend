import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { LocalAppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';
import { BackendIdentifierResolver } from '../../backend-identifier/backend_identifier_resolver.js';
import { FormGenerationHandler } from './forms/form_generation_handler.js';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const localAppNameResolver = new LocalAppNameResolver(
    new CwdPackageJsonLoader()
  );

  const backendIdentifierResolver = new BackendIdentifierResolver(
    localAppNameResolver
  );

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGenerator,
    backendIdentifierResolver
  );

  const generateFormsCommand = new GenerateFormsCommand(
    backendIdentifierResolver,
    (id) => new BackendOutputClient(credentialProvider, id),
    new FormGenerationHandler({ credentialProvider })
  );

  return new GenerateCommand(generateConfigCommand, generateFormsCommand);
};
