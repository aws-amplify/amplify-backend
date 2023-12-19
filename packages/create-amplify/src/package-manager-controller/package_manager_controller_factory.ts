import { execa as _execa } from 'execa';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';

export type DependencyType = 'dev' | 'prod';

/**
 * packageManagerControllerFactory
 */
export class PackageManagerControllerFactory {
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
        return new NpmPackageManagerController(this.projectRoot);
      case 'pnpm':
        return new PnpmPackageManagerController(this.projectRoot);
      case 'yarn-classic':
        return new YarnClassicPackageManagerController(this.projectRoot);
      case 'yarn-modern':
        return new YarnModernPackageManagerController(this.projectRoot);
      default:
        throw new Error(
          `Package Manager ${packageManagerName} is not supported.`
        );
    }
  }
}
