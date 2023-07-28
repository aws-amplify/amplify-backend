import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { LocalProjectNameResolver } from '../../local_project_name_resolver.js';
import { LocalDisambiguatorResolver } from '../../local_disambiguator_resolver.js';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const appNameResolver = new LocalProjectNameResolver();
  const disambiguatorResolver = new LocalDisambiguatorResolver();
  const sandboxFactory = new SandboxSingletonFactory(
    appNameResolver.resolve,
    disambiguatorResolver.resolve
  );
  return new SandboxCommand(
    sandboxFactory,
    new SandboxDeleteCommand(sandboxFactory)
  );
};
