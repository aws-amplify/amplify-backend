import { logger } from '../logger.js';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { PnpmPackageManagerController } from '../package-manager-controller/pnpm_package_manager_controller.js';

/**
 * Ensure that the current working directory is a valid JavaScript project
 */
export class PnpmProjectInitializer extends PnpmPackageManagerController {
  /**
   * injecting console and fs for testing
   */
  constructor(
    protected readonly projectRoot: string,
    private readonly packageJsonExists: (projectRoot: string) => boolean
  ) {
    super(projectRoot);
  }

  /**
   * If package.json already exists, this is a noop. Otherwise, `pnpm init` is executed to create a package.json file
   */
  ensureInitialized = async (): Promise<void> => {
    if (this.packageJsonExists(this.projectRoot)) {
      // if package.json already exists, no need to do anything
      return;
    }

    logger.debug(
      `No package.json file found in the current directory. Running \`${this.packageManager.executable} init\`...`
    );

    try {
      await executeWithDebugLogger(
        this.projectRoot,
        this.packageManager.executable,
        this.packageManager.initDefault,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${this.packageManager.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.projectRoot)) {
      // this should only happen if the customer exits out of `pnpm init` before finishing
      throw new Error(
        `package.json does not exist after running \`${this.packageManager.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  };
}
