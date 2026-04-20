import { CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import {
  AmplifyIOEventsBridgeSingletonFactory,
  PackageManagerControllerFactory,
  format,
} from '@aws-amplify/cli-core';

import { SynthCommand, SynthCommandOptions } from './synth_command.js';
import { SDKProfileResolverProvider } from '../../sdk_profile_resolver_provider.js';

/**
 * Creates synth command
 */
export const createSynthCommand = (): CommandModule<
  object,
  SynthCommandOptions
> => {
  const packageManagerControllerFactory = new PackageManagerControllerFactory();
  const cdkEventsBridgeIoHost =
    new AmplifyIOEventsBridgeSingletonFactory().getInstance();

  const backendDeployerFactory = new BackendDeployerFactory(
    packageManagerControllerFactory.getPackageManagerController(),
    format,
    cdkEventsBridgeIoHost,
    new SDKProfileResolverProvider().resolve,
  );
  const backendDeployer = backendDeployerFactory.getInstance();
  return new SynthCommand(backendDeployer);
};
