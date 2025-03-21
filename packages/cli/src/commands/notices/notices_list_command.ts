import { Argv, CommandModule } from 'yargs';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesPrinter } from '../../notices/notices_printer.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';

type NoticesListCommandOptionsKebabCase = ArgumentsKebabCase<{
  all?: boolean;
}>;

/**
 * Notices list command.
 */
export class NoticesListCommand
  implements CommandModule<object, NoticesListCommandOptionsKebabCase>
{
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
    this.describe =
      'Displays active notices relevant to your Amplify backend environment. ' +
      'Shows important information about package compatibility, version updates, ' +
      'and potential issues that may affect your development workflow.';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: NoticesListCommandOptionsKebabCase): Promise<void> => {
    const notices = await this.noticesController.getApplicableNotices({
      event: 'listNoticesCommand',
      includeAcknowledged: args.all,
    });
    this.noticesPrinter.print(notices);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs
      .version(false)
      .option('all', {
        type: 'boolean',
        describe: 'Includes already acknowledged notices',
      })
      .help();
  };
}
