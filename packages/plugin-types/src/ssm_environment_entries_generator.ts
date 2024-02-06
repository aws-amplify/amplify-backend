import { SsmEnvironmentEntry } from './resource_access_acceptor.js';

export type SsmEnvironmentEntriesGenerator = {
  generateSsmEnvironmentEntries: (
    scopeContext: Record<string, string>
  ) => SsmEnvironmentEntry[];
};
