import { InfoCommand } from './info_command.js';
import { CdkInfoProvider } from '../../info/cdk_info_provider.js';
import { EnvironmentInfoProvider } from '../../info/env_info_provider.js';

/**
 * Creates Info command.
 */
export const createInfoCommand = (): InfoCommand => {
  const environmentInfoProvider = new EnvironmentInfoProvider();
  const cdkInfoProvider = new CdkInfoProvider();

  return new InfoCommand(environmentInfoProvider, cdkInfoProvider);
};
