import * as _os from 'os';

/**
 * Creates a local disambiguation value from the current username
 */
export class LocalDisambiguatorResolver {
  /**
   * Execa is assigned to an instance member for testing.
   * Resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly os = _os) {
    this.resolve = this.resolve.bind(this);
  }

  /**
   * Return the current username
   */
  async resolve() {
    return this.os.userInfo().username;
  }
}
