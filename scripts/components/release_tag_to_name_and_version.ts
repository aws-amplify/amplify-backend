/**
 * Splits a release tag of <packageName>@<version> into its constituent parts
 */
export const releaseTagToNameAndVersion = (releaseTag: string) => {
  const indexOfLastAt = releaseTag.lastIndexOf('@');
  return {
    packageName: releaseTag.slice(0, indexOfLastAt),
    version: releaseTag.slice(indexOfLastAt + 1),
  };
};
