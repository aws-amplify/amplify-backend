import {
  ClientConfigFileBaseName,
  ClientConfigVersion,
  ClientConfigVersionOption,
} from '../index.js';

/**
 * Returns the client config file name for different versions of client config
 */
export const getClientConfigFileName = (version: ClientConfigVersion) => {
  const isLegacyConfig = version === ClientConfigVersionOption.LEGACY;
  return isLegacyConfig
    ? ClientConfigFileBaseName.LEGACY
    : ClientConfigFileBaseName.DEFAULT;
};
