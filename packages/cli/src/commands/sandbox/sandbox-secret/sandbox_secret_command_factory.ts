import { CommandModule } from 'yargs';

import { PackageJsonReader } from '@aws-amplify/platform-core';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretCommand } from './sandbox_secret_command.js';
import { SandboxSecretSetCommand } from './sandbox_secret_set_command.js';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';
import { SandboxSecretGetCommand } from './sandbox_secret_get_command.js';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';

/**
 * Creates sandbox secret commands.
 */
export const createSandboxSecretCommand = (): CommandModule => {
  const sandboxIdResolver = new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  );

  const secretClient = getSecretClient();
  const setCommand = new SandboxSecretSetCommand(
    sandboxIdResolver,
    secretClient
  );
  const removeCommand = new SandboxSecretRemoveCommand(
    sandboxIdResolver,
    secretClient
  );
  const getCommand = new SandboxSecretGetCommand(
    sandboxIdResolver,
    secretClient
  );
  const listCommand = new SandboxSecretListCommand(
    sandboxIdResolver,
    secretClient
  );

  return new SandboxSecretCommand([
    setCommand as unknown as CommandModule,
    removeCommand as unknown as CommandModule,
    getCommand as unknown as CommandModule,
    listCommand,
  ]);
};
