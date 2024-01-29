import { InfoCommand } from './info_command.js';
import { CdkInfoProvider } from '../../info/cdk_info.js';
import { EnvironmentInfoProvider } from '../../info/env_info.js';

/**
 * Creates Info command.
 */
export const createInfoCommand = (): InfoCommand => {
  const environmentInfoProvider = new EnvironmentInfoProvider();
  const cdkInfoProvider = new CdkInfoProvider();

  return new InfoCommand(environmentInfoProvider, cdkInfoProvider);
};
