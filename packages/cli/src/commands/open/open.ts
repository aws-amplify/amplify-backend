import opn from 'open';
import { ChildProcess } from 'child_process';
import { Printer } from '@aws-amplify/cli-core';

/**
 * Helper class to open apps (URLs, files, executable). Cross-platform.
 */
export class Open {
  static open = async (
    target: string,
    options: opn.Options
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
    Printer.print(`Unable to open ${target}: ${err.message}`);
    if ('code' in err && err['code'] === 'ENOENT') {
      Printer.print('Have you installed `xdg-utils` on your machine?');
    }
  };
}
