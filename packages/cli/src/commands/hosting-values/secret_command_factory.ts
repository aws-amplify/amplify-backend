import { CommandModule } from 'yargs';
import { HostingValueStore } from './hosting_value_store.js';
import {
  HostingValueGetCommand,
  HostingValueListCommand,
  HostingValueRemoveCommand,
  HostingValueRootCommand,
  HostingValueSetCommand,
} from './hosting_value_commands.js';

/**
 * Assembles the `ampx secret` command family for self-managed hosting secrets
 * (AWS Secrets Manager). Distinct from `ampx sandbox secret`, which manages
 * Amplify-managed backend secrets (SSM SecureString, scoped by app-id/branch).
 */
export const createSecretCommand = (): CommandModule => {
  const store = new HostingValueStore('secret');
  return new HostingValueRootCommand(
    'secret',
    'Manage self-managed hosting secrets',
    [
      new HostingValueSetCommand('secret', store) as unknown as CommandModule,
      new HostingValueGetCommand('secret', store) as unknown as CommandModule,
      new HostingValueListCommand('secret', store) as unknown as CommandModule,
      new HostingValueRemoveCommand(
        'secret',
        store,
      ) as unknown as CommandModule,
    ],
  );
};
