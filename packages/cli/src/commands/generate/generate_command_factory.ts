import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { GenerateGraphqlClientCodeCommand } from './graphql-client-code/generate_graphql_client_code_command.js';
import { LocalNamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { GenerateApiCodeAdapter } from './graphql-client-code/generate_api_code_adapter.js';
import { FormGenerationHandler } from '../../form-generation/form_generation_handler.js';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { SandboxBackendIdResolver } from '../sandbox/sandbox_id_resolver.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { BackendIdentifierResolverWithFallback } from '../../backend-identifier/backend_identifier_with_sandbox_fallback.js';
import { AppBackendIdentifierResolver } from '../../backend-identifier/backend_identifier_resolver.js';
import { GenerateSchemaCommand } from './schema-from-database/generate_schema_command.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SchemaGenerator } from '@aws-amplify/schema-generator';
import { printer } from '@aws-amplify/cli-core';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  const credentialProvider = fromNodeProviderChain();
  const secretClient = getSecretClient();

  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );

  const namespaceResolver = new LocalNamespaceResolver(new PackageJsonReader());

  const backendIdentifierResolver = new BackendIdentifierResolverWithFallback(
    new AppBackendIdentifierResolver(namespaceResolver),
    new SandboxBackendIdResolver(namespaceResolver)
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

  const generateSchemaCommand = new GenerateSchemaCommand(
    backendIdentifierResolver,
    secretClient,
    new SchemaGenerator()
  );

  const commandMiddleware = new CommandMiddleware(printer);

  return new GenerateCommand(
    generateConfigCommand,
    generateFormsCommand,
    generateGraphqlClientCodeCommand,
    generateSchemaCommand,
    commandMiddleware
  );
};
