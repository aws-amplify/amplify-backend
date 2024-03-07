import opn, { Options } from 'open';
import { ChildProcess } from 'child_process';
import { printer } from '@aws-amplify/cli-core';

/**
 * Helper class to open apps (URLs, files, executable). Cross-platform.
 */
export class Open {
  static open = async (
    target: string,
    options: Options
  ): Promise<ChildProcess | void> => {
    let childProcess: ChildProcess;
    try {
      childProcess = await opn(target, options);
      childProcess.on('error', (e) => this.handleOpenError(e, target));
    } catch (e) {
      this.handleOpenError(e as Error, target);
      return;
    }
    return childProcess;
  };

  static handleOpenError = (err: Error, target: string) => {
    printer.log(`Unable to open ${target}: ${err.message}`);
    if ('code' in err && err['code'] === 'ENOENT') {
      printer.log('Have you installed `xdg-utils` on your machine?');
    }
  };
}
