import { CommandModule } from 'yargs';
import {
  SandboxCommand,
  SandboxCommandOptions,
  SandboxEventHandlerCreator,
} from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxIdResolver } from './sandbox_id_resolver.js';
import { PackageJsonFileLoader } from '../../package_json_loader.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LocalAppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { FormGenerationHandler } from '../../form-generation/form_generation_handler.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const credentialProvider = fromNodeProviderChain();
  const sandboxIdResolver = new SandboxIdResolver(
    new LocalAppNameResolver(new PackageJsonFileLoader())
  );
  const sandboxFactory = new SandboxSingletonFactory(sandboxIdResolver.resolve);
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const getBackendIdentifier = async (appName?: string) => {
    const sandboxId = appName ?? (await sandboxIdResolver.resolve());
    return new SandboxBackendIdentifier(sandboxId);
  };
  const formGeneratorHandler = new FormGenerationHandler({
    credentialProvider,
  });
  const sandboxEventHandlerCreator: SandboxEventHandlerCreator = ({
    appName,
    clientConfigOutDir,
    format,
    modelsOutDir,
    uiOutDir,
    modelsFilter,
  }) => {
    return {
      successfulDeployment: [
        async () => {
          const backendIdentifier = await getBackendIdentifier(appName);
          await clientConfigGeneratorAdapter.generateClientConfigToFile(
            backendIdentifier,
            clientConfigOutDir,
            format
          );
          const outputClient = new BackendOutputClient(
            credentialProvider,
            backendIdentifier
          );
          const output = await outputClient.getOutput();
          const apiUrl =
            output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;
          if (apiUrl) {
            await formGeneratorHandler.generate({
              backendIdentifier,
              apiUrl,
              modelsOutDir,
              uiOutDir,
              modelsFilter,
            });
          }
        },
      ],
    };
  };
  return new SandboxCommand(
    sandboxFactory,
    [new SandboxDeleteCommand(sandboxFactory), createSandboxSecretCommand()],
    sandboxEventHandlerCreator
  );
};
