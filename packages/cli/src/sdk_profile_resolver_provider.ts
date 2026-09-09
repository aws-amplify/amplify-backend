/**
 * Provides a function that resolves an SDK Profile if provided by the user
 */
export class SDKProfileResolverProvider {
  /**
   * Returns profile name parsed from the cli arguments
   */
  resolve = (): string | undefined => {
    let profile = undefined;
    if (process && process.argv) {
      for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] == '--profile') {
          profile = process.argv[i + 1];
        }
      }
    }
    return profile;
  };
}
