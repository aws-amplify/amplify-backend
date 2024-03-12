import {
  ClientConfigFileName,
  ClientConfigVersion,
  ClientConfigVersions,
} from '../index.js';

/**
 * Returns the client config file name for different versions of client config
 */
export const getClientConfigFileName = (version: ClientConfigVersion) => {
  const isLegacyConfig = version === ClientConfigVersions.LEGACY;
  return isLegacyConfig
    ? ClientConfigFileName.LEGACY
    : ClientConfigFileName.GEN2;
};
