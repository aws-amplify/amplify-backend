import { Argv, CommandModule } from 'yargs';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesPrinter } from '../../notices/notices_printer.js';

/**
 * Notices list command.
 */
export class NoticesListCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates notices list command
   */
  constructor(
    private readonly noticesController: NoticesController,
    private readonly noticesPrinter: NoticesPrinter,
  ) {
    this.command = 'list';
    this.describe = 'Displays a list of relevant notices';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const notices = await this.noticesController.getApplicableNotices({
      event: 'listing',
    });
    this.noticesPrinter.print(notices);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).help();
  };
}
