import semver from 'semver';

const APIVersionToPayloadVersion = new Map<string, Array<string>>([
  ['v1.0', ['1.0.0', '1.0.1', '1.1.0']],
]);

/**
 * returns the latest available API version
 */
export const getLatestApiVersion = (): string => {
  return [...APIVersionToPayloadVersion.keys()].reduce(getMaxVersion, '0');
};

const getMaxVersion = (previousValue: string, currentValue: string): string => {
  const cleanVer = semver.coerce(currentValue);
  const cleanPreviousVer = semver.coerce(previousValue);
  if (cleanVer === null || cleanPreviousVer == null)
    throw new Error('version format is wrong ');
  if (semver.gt(cleanVer, cleanPreviousVer)) {
    return currentValue;
  }
  return previousValue;
};

/**
 * returns the latest available payload version
 */
export const getLatestPayloadVersion = (): string => {
  const versions = APIVersionToPayloadVersion.get(getLatestApiVersion());
  if (!versions) {
    throw new Error(
      `No Payload Versions mapped to API Version ${getLatestApiVersion()}`
    );
  }
  return versions.reduce(getMaxVersion, '0');
};
