import { existsSync as _existsSync } from 'fs';
import fsp from 'fs/promises';
import { execa as _execa } from 'execa';
import * as path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';

export type DependencyType = 'dev' | 'prod';

/**
 *
 */
export abstract class PackageManagerController {
  protected projectRoot: string;
  protected executable: string;
  protected binaryRunner: string;
  protected initDefault: string[];
  protected installCommand: string;
  protected readonly execa = _execa;

  private readonly executeWithDebugLogger = _executeWithDebugLogger;
  private readonly existsSync = _existsSync;

  abstract installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
  abstract getWelcomeMessage: () => string;
  abstract generateInitialProjectFiles: () => Promise<void>;

  /**
   * initializeProject
   */
  async initializeProject() {
    if (this.packageJsonExists(this.projectRoot)) {
      // if package.json already exists, no need to do anything
      return;
    }

    logger.debug(
      `No package.json file found in the current directory. Running \`${this.executable} init\`...`
    );

    try {
      await this.executeWithDebugLogger(
        this.projectRoot,
        this.executable,
        this.initDefault,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${this.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.projectRoot)) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        `package.json does not exist after running \`${this.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  }

  /**
   * Check if a package.json file exists in projectRoot
   */
  private packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(path.resolve(projectRoot, 'package.json'));
  };
}

/**
 * packageManagerControllerFactory
 */
export class PackageManagerControllerFactory {
  private readonly fsp = fsp;
  private readonly executeWithDebugLogger = _executeWithDebugLogger;
  private readonly execa = _execa;

  /**
   * constructor
   */
  constructor(
    private readonly projectRoot: string,
    private readonly userAgent: string | undefined
  ) {}

  initializeTsConfig = async (
    targetDir: string,
    packageManagerProps: { name: string; binaryRunner: string }
  ): Promise<void> => {
    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
    ];

    if (packageManagerProps.name.startsWith('yarn')) {
      await this.executeWithDebugLogger(
        targetDir,
        'yarn',
        ['add', 'typescript@^5'],
        this.execa
      );
    }

    await this.executeWithDebugLogger(
      targetDir,
      packageManagerProps.binaryRunner,
      tscArgs,
      this.execa
    );
  };

  /**
   * getPackageManager
   */
  private getPackageManagerName() {
    if (!this.userAgent) {
      logger.warn('Could not determine package manager, defaulting to npm');
      return 'npm';
    }

    const packageManagerAndVersion = this.userAgent.split(' ')[0];
    const packageManagerName = packageManagerAndVersion.split('/')[0];

    if (packageManagerName === 'yarn') {
      const yarnMajorVersion = packageManagerAndVersion
        .split('/')[1]
        .split('.')[0];
      const yarnName = `${packageManagerName}-${
        yarnMajorVersion === '1' ? 'classic' : 'modern'
      }`;
      return yarnName;
    }
    return packageManagerName;
  }

  /**
   * getPackageManagerController
   */
  getPackageManagerController() {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmPackageManagerController();
      case 'pnpm':
        return new PnpmPackageManagerController();
      case 'yarn-classic':
        return new YarnClassicPackageManagerController();
      case 'yarn-modern':
        return new YarnModernPackageManagerController();
      default:
        throw new Error(
          `Package Manager ${packageManagerName} is not supported.`
        );
    }
  }

  /**
   * Copies the template directory to an amplify folder within the projectRoot
   */
  generateInitialProjectFiles = async (packageManagerProps: {
    name: string;
    binaryRunner: string;
  }): Promise<void> => {
    const targetDir = path.resolve(this.projectRoot, 'amplify');
    await this.fsp.mkdir(targetDir, { recursive: true });
    await this.fsp.cp(
      new URL('../../templates/basic-auth-data/amplify', import.meta.url),
      targetDir,
      { recursive: true }
    );

    const packageJsonContent = { type: 'module' };
    await this.fsp.writeFile(
      path.resolve(targetDir, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );

    await this.initializeTsConfig(targetDir, packageManagerProps);
  };
}
