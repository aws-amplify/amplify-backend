import { existsSync as _existsSync } from 'fs';
import _fsp from 'fs/promises';
import { execa as _execa } from 'execa';
import * as _path from 'path';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { PackageManagerControllerBase } from './package_manager_controller_base.js';
import { BunLockFileReader } from './lock-file-reader/bun_lock_file_reader.js';

/**
 * BunPackageManagerController is an abstraction around bun commands that are needed to initialize a project and install dependencies
 */
export class BunPackageManagerController extends PackageManagerControllerBase {
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
    protected readonly lockFileReader = new BunLockFileReader(),
  ) {
    super(
      cwd,
      'bun',
      ['init', '--yes'],
      'add',
      lockFileReader,
      fsp,
      path,
      execa,
      executeWithDebugLogger,
      existsSync,
    );
  }
}
