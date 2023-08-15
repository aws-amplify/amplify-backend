import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { LocalAppNameResolver } from '../../local_app_name_resolver.js';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const appIdResolver = new LocalAppNameResolver();
  const sandboxFactory = new SandboxSingletonFactory(appIdResolver.resolve);
  return new SandboxCommand(
    sandboxFactory,
    new SandboxDeleteCommand(sandboxFactory)
  );
};
