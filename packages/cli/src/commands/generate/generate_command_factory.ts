import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { GenerateGraphqlClientCodeCommand } from './graphql-client-code/generate_graphql_client_code_command.js';
import { LocalNamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { BackendIdentifierResolver } from '../../backend-identifier/backend_identifier_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { GenerateApiCodeAdapter } from './graphql-client-code/generate_api_code_adapter.js';
import { FormGenerationHandler } from '../../form-generation/form_generation_handler.js';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { CommandMiddleware } from '../../command_middleware.js';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const localAppNameResolver = new LocalNamespaceResolver(
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
    () =>
      BackendOutputClientFactory.getInstance({
        credentials: credentialProvider,
      }),
    new FormGenerationHandler({ credentialProvider })
  );

  const generateApiCodeAdapter = new GenerateApiCodeAdapter(credentialProvider);

  const generateGraphqlClientCodeCommand = new GenerateGraphqlClientCodeCommand(
    generateApiCodeAdapter,
    backendIdentifierResolver
  );

  const commandMiddleware = new CommandMiddleware();

  return new GenerateCommand(
    generateConfigCommand,
    generateFormsCommand,
    generateGraphqlClientCodeCommand,
    commandMiddleware
  );
};
