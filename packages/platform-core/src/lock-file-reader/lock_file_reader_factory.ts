import { NpmLockFileReader } from './npm_lock_file_reader';
import { PnpmLockFileReader } from './pnpm_lock_file_reader';
import { YarnClassicLockFileReader } from './yarn_classic_lock_file_reader';
import { YarnModernLockFileReader } from './yarn_modern_lock_file_reader';

/**
 * LockFileReaderFactory is a factory for an abstraction around reading lock files from different package managers
 */
export class LockFileReaderFactory {
  /**
   * Creates a lock file reader factory
   */
  constructor(private readonly platform = process.platform) {}

  /**
   * Gets the lock file reader based on the package manager being used
   */
  getLockFileReader(): LockFileReader {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmLockFileReader();
      case 'pnpm':
        return new PnpmLockFileReader();
      case 'yarn-classic':
        return new YarnClassicLockFileReader();
      case 'yarn-modern':
        return new YarnModernLockFileReader();
      default:
        // defaults to npm lock file reader as it is the most used package manager by customers
        return new NpmLockFileReader();
    }
  }

  /**
   * Get package manager name from npm_config_user_agent
   */
  private getPackageManagerName() {
    const userAgent = process.env.npm_config_user_agent;
    if (userAgent === undefined) {
      return;
    }
    const packageManagerAndVersion = userAgent.split(' ')[0];
    const [packageManagerName, packageManagerVersion] =
      packageManagerAndVersion.split('/');

    if (packageManagerName === 'yarn') {
      const yarnMajorVersion = packageManagerVersion.split('.')[0];
      return `yarn-${yarnMajorVersion === '1' ? 'classic' : 'modern'}`;
    }
    return packageManagerName;
  }
}

export type LockFileReader = {
  getLockFileContentsFromCwd: () => Promise<LockFileContents>;
};

export type LockFileContents = {
  dependencies: Dependencies;
};

export type Dependencies = Array<{ name: string; version: string }>;
