import path from 'path';
import _fs from 'fs/promises';

/**
 *
 */
export class InitialProjectFileGenerator {
  /**
   * Responsible for copying getting started template to a new project directory
   * fs is injected for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly fs = _fs
  ) {}

  /**
   * Copies the template directory to an amplify folder within the projectRoot
   */
  async generateInitialProjectFiles(): Promise<void> {
    const targetDir = path.resolve(this.projectRoot, 'amplify');
    await this.fs.mkdir(targetDir, { recursive: true });
    /*
      Note: Although the source code template directory contains expected-cdk-out test assets,
      these assets are not published to npm and thus not copied when this code runs in production
     */
    await this.fs.cp(
      new URL('../templates/basic-auth-data', import.meta.url),
      targetDir,
      { recursive: true }
    );
  }
}
