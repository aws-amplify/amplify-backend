import { NoticesController } from './notices_controller.js';
import { NoticesPrinter } from './notices_printer.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { printer } from '@aws-amplify/cli-core';

/**
 * Processes and renders notices after command execution.
 */
export class PostCommandNoticesProcessor {
  /**
   * Creates post command notices' processor.
   */
  constructor(
    packageManagerController: PackageManagerController,
    private readonly noticesController: NoticesController = new NoticesController(
      packageManagerController
    ),
    private readonly noticesPrinter: NoticesPrinter = new NoticesPrinter(
      packageManagerController
    ),
    private readonly _printer = printer
  ) {}

  tryFindAndPrintApplicableNotices = async (command: string | undefined) => {
    if (command?.startsWith('notices')) {
      return;
    }
    const notices = await this.noticesController.getApplicableNotices({
      includeAcknowledged: false,
    });
    if (notices.length > 0) {
      this._printer.printNewLine();
      this.noticesPrinter.print(notices);
    }
  };
}
