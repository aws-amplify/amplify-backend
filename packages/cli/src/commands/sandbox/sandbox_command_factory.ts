import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxIdResolver } from './sandbox_id_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { SandboxSecretCommand } from './sandbox-secret/sandbox_secret_command.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { LocalAppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const sandboxIdResolver = new SandboxIdResolver(
    new LocalAppNameResolver(new CwdPackageJsonLoader())
  );
  const sandboxFactory = new SandboxSingletonFactory(sandboxIdResolver.resolve);

  return new SandboxCommand(
    sandboxFactory,
    new SandboxDeleteCommand(sandboxFactory),
    new SandboxSecretCommand(sandboxIdResolver, getSecretClient())
  );
};
