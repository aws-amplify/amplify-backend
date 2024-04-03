/**
 * Given a string like '@aws-amplify/auth-construct-alpha@0.6.0-beta.8', this regex will grab 'beta' from the string.
 * For a non-pre release tag like @aws-amplify/backend-cli@0.10.0, this regex will not match and we default to the 'latest' tag.
 */
export const getDistTagFromReleaseTag = (releaseTag: string) => {
  const distTagMatch = releaseTag.match(/\.\d+-(?<distTag>[\w\-.]+)\.\d+$/);
  return distTagMatch?.groups?.distTag ?? 'latest';
};
