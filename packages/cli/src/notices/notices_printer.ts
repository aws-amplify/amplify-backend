import { Notice, printer } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';

/**
 * Prints notices.
 */
export class NoticesPrinter {
  /**
   * Creates notices printer
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly _printer = printer
  ) {}
  print = (notices: Array<Notice>) => {
    if (notices.length === 0) {
      return;
    }
    this._printer.print(`Notices:`);
    this._printer.printNewLine();
    for (const notice of notices) {
      this.printSingleNotice(notice);
      this._printer.printNewLine();
    }
    this._printer.print(
      `If you don't want to see a notice anymore, use "${this.packageManagerController.getCommand(
        ['ampx', 'notices', 'acknowledge', '<notice-id>']
      )}".`
    );
  };

  private printSingleNotice = (notice: Notice) => {
    this._printer.print(`${notice.id}\t${notice.title}`);
    this._printer.printNewLine();
    this.printDetails(notice.details);
    this._printer.printNewLine();
    if (notice.link) {
      this._printer.print(`\tMore information at: ${notice.link}`);
      this._printer.printNewLine();
    }
  };

  private printDetails = (details: string) => {
    const tokens = details.split(/\s/);
    const lineLengthLimit = 80;
    let currentLine = '';
    const lines: Array<string> = [];

    for (const token of tokens) {
      if (currentLine.length + token.length > lineLengthLimit) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = token;
      } else {
        if (currentLine.length > 0) {
          currentLine = `${currentLine} ${token}`;
        } else {
          currentLine = token;
        }
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    for (const line of lines) {
      this._printer.print(`\t${line}`);
    }
  };
}
