import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { LocalAppNameResolver } from '../../local_app_name_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { GenerateGraphqlClientCodeCommand } from './graphql-client-code/generate_graphql_client_code_command.js';
import { GraphqlClientCodeGeneratorAdapter } from './graphql-client-code/generate_graphql_client_code_generator_adapter.js';

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

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGenerator,
    localAppNameResolver
  );

  const graphqlClientCodeGeneratorAdapter =
    new GraphqlClientCodeGeneratorAdapter(credentialProvider);

  const generateGraphqlClientCodeCommand = new GenerateGraphqlClientCodeCommand(
    graphqlClientCodeGeneratorAdapter,
    localAppNameResolver
  );

  return new GenerateCommand(
    generateConfigCommand,
    generateGraphqlClientCodeCommand
  );
};
