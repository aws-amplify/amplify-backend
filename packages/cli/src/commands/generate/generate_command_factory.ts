import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './config/generate_config_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { ClientConfigWriter } from '@aws-amplify/client-config';
import { LocalAppNameResolver } from '../../local_app_name_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';

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
  const localAppNameResolver = new LocalAppNameResolver(
    new CwdPackageJsonLoader()
  );

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGenerator,
    localAppNameResolver,
    configWriter
  );

  return new GenerateCommand(generateConfigCommand);
};
