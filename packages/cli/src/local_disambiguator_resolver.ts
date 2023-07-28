import { execa } from 'execa';

/**
 * Creates a local disambiguation value from executing "whoami"
 */
export class LocalDisambiguatorResolver {
  /**
   * Execa is assigned to an instance member for testing.
   * Resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly executeCommand = execa) {
    this.resolve.bind(this);
  }

  /**
   * Execute "whoami" and return the result
   */
  async resolve() {
    const { stdout } = await this.executeCommand('whoami');
    return stdout.toLocaleString().trim();
  }
}
