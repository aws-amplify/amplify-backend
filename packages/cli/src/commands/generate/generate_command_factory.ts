import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';
import { PackageJsonFileLoader } from '../../package_json_loader.js';
import { GenerateGraphqlClientCodeCommand } from './graphql-client-code/generate_graphql_client_code_command.js';
import { LocalAppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';
import { BackendIdentifierResolver } from '../../backend-identifier/backend_identifier_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { FormGenerationHandler } from './forms/form_generation_handler.js';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { GenerateApiCodeAdapter } from './graphql-client-code/generate_api_code_adapter.js';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const localAppNameResolver = new LocalAppNameResolver(
    new PackageJsonFileLoader()
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

  const generateApiCodeAdapter = new GenerateApiCodeAdapter(credentialProvider);

  const generateGraphqlClientCodeCommand = new GenerateGraphqlClientCodeCommand(
    generateApiCodeAdapter,
    backendIdentifierResolver
  );

  return new GenerateCommand(
    generateConfigCommand,
    generateFormsCommand,
    generateGraphqlClientCodeCommand
  );
};
