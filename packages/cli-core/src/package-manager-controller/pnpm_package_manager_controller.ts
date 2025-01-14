import _fsp from 'fs/promises';
import * as _path from 'path';
import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { PackageManagerControllerBase } from './package_manager_controller_base.js';
import { PnpmLockFileReader } from './lock-file-reader/pnpm_lock_file_reader.js';

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
    protected readonly lockFileReader = new PnpmLockFileReader()
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
      existsSync
    );
  }
}
