import { NoticesController } from './notices_controller.js';
import { NoticesPrinter } from './notices_printer.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';

/**
 * Processes and renders notices after command execution.
 */
export class PostCommandNoticesProcessor {
  /**
   * Creates post command notices' processor.
   */
  constructor(
    packageManagerController: PackageManagerController,
    private readonly noticesController: NoticesController = new NoticesController(),
    private readonly noticesPrinter: NoticesPrinter = new NoticesPrinter(
      packageManagerController
    )
  ) {}

  tryFindAndPrintApplicableNotices = async () => {
    const notices = await this.noticesController.getApplicableNotices({
      includeAcknowledged: false,
    });
    this.noticesPrinter.print(notices);
  };
}
