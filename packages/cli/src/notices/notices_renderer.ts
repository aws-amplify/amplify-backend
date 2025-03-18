import { NoticesController } from './notices_controller.js';
import { NoticesPrinter } from './notices_printer.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import { hideBin } from 'yargs/helpers';

export type NoticesRendererParams = {
  event: 'postCommand' | 'postDeployment' | 'listing';
  error?: Error;
};

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

  tryFindAndPrintApplicableNotices = async (params: NoticesRendererParams) => {
    const command: string | undefined = hideBin(this._process.argv)[0];
    if (command?.startsWith('notices')) {
      return;
    }
    try {
      const notices = await this.noticesController.getApplicableNotices({
        includeAcknowledged: false,
        ...params,
      });
      if (notices.length > 0) {
        this._printer.printNewLine();
        this.noticesPrinter.print(notices);
        await this.noticesController.recordPrintingTimes(notices);
      }
    } catch (e) {
      this._printer.log(
        `Unable to render notices on event=${params.event}`,
        LogLevel.DEBUG,
      );
      if (e instanceof Error) {
        this._printer.log(e.message, LogLevel.DEBUG);
      }
    }
  };
}
