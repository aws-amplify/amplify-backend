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
 * Assembles the `ampx config` command family for self-managed hosting config
 * values (SSM Parameter Store) — non-sensitive values such as domains, feature
 * flags, and connection ARNs, read at runtime with `getConfig`.
 */
export const createConfigCommand = (): CommandModule => {
  const store = new HostingValueStore('config');
  return new HostingValueRootCommand(
    'config',
    'Manage self-managed hosting config values',
    [
      new HostingValueSetCommand('config', store) as unknown as CommandModule,
      new HostingValueGetCommand('config', store) as unknown as CommandModule,
      new HostingValueListCommand('config', store) as unknown as CommandModule,
      new HostingValueRemoveCommand(
        'config',
        store,
      ) as unknown as CommandModule,
    ],
  );
};
