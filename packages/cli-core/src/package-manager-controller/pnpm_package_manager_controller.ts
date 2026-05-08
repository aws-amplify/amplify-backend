import _fsp from 'fs/promises';
import * as _path from 'path';
import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { EOL } from 'os';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { PackageManagerControllerBase } from './package_manager_controller_base.js';
import { PnpmLockFileReader } from './lock-file-reader/pnpm_lock_file_reader.js';

const PNPM_ALLOW_BUILDS_CONFIG = [
  'allowBuilds[esbuild]=true',
  'allowBuilds[@parcel/watcher]=true',
].join(EOL);

/**
 * PnpmPackageManagerController is an abstraction around pnpm commands that are needed to initialize a project and install dependencies
 */
export class PnpmPackageManagerController extends PackageManagerControllerBase {
  /**
   * constructor
   */
  constructor(
    protected readonly cwd: string,
    protected readonly fsp = _fsp,
    protected readonly path = _path,
    protected readonly execa = _execa,
    protected readonly executeWithDebugLogger = _executeWithDebugLogger,
    protected readonly existsSync = _existsSync,
    protected readonly lockFileReader = new PnpmLockFileReader(),
  ) {
    super(
      cwd,
      'pnpm',
      ['init'],
      'install',
      lockFileReader,
      fsp,
      path,
      execa,
      executeWithDebugLogger,
      existsSync,
    );
  }

  /**
   * Initializes the project and ensures .npmrc is configured with allowBuilds
   * for pnpm v11+ which blocks build scripts by default.
   */
  override async initializeProject() {
    await super.initializeProject();
    await this.ensureAllowBuildsConfig();
  }

  private async ensureAllowBuildsConfig(): Promise<void> {
    const npmrcPath = this.path.resolve(this.cwd, '.npmrc');
    let existingContent = '';

    if (this.existsSync(npmrcPath)) {
      existingContent = await this.fsp.readFile(npmrcPath, 'utf-8');
      if (existingContent.includes('allowBuilds[esbuild]')) {
        return;
      }
    }

    const newContent = existingContent
      ? `${existingContent.trimEnd()}${EOL}${EOL}${PNPM_ALLOW_BUILDS_CONFIG}${EOL}`
      : `${PNPM_ALLOW_BUILDS_CONFIG}${EOL}`;

    await this.fsp.writeFile(npmrcPath, newContent, 'utf-8');
  }
}
