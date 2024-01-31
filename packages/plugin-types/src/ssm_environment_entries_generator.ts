import { Construct } from 'constructs';
import { SsmEnvironmentEntry } from './resource_access_acceptor.js';

export type SsmEnvironmentEntriesGenerator = {
  generateSsmEnvironmentEntries: (
    scope: Construct,
    scopeContext: Record<string, string>
  ) => SsmEnvironmentEntry[];
};
