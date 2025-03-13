import { NoticesController } from './notices_controller.js';
import { NoticesPrinter } from './notices_printer.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { printer } from '@aws-amplify/cli-core';
import { hideBin } from 'yargs/helpers';

/**
 * Renders notices.
 */
export class NoticesRenderer {
  /**
   * Creates notices renderer.
   */
  constructor(
    packageManagerController: PackageManagerController,
    private readonly noticesController: NoticesController = new NoticesController(
      packageManagerController,
    ),
    private readonly noticesPrinter: NoticesPrinter = new NoticesPrinter(
      packageManagerController,
    ),
    private readonly _printer = printer,
    private readonly _process = process,
  ) {}

  tryFindAndPrintApplicableNotices = async (opts?: { error?: Error }) => {
    const command: string | undefined = hideBin(this._process.argv)[0];
    if (command?.startsWith('notices')) {
      return;
    }
    const notices = await this.noticesController.getApplicableNotices({
      includeAcknowledged: false,
      error: opts?.error,
    });
    if (notices.length > 0) {
      this._printer.printNewLine();
      this.noticesPrinter.print(notices);
    }
  };
}
