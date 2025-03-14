import { Argv, CommandModule } from 'yargs';
import { printer } from '@aws-amplify/cli-core';
import { NoticesController } from '../../notices/notices_controller.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';

type NoticesAcknowledgeCommandOptionsKebabCase = ArgumentsKebabCase<{
  noticeId: string;
}>;

/**
 * Notices acknowledge command.
 */
export class NoticesAcknowledgeCommand
  implements CommandModule<object, NoticesAcknowledgeCommandOptionsKebabCase>
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
   * Creates notices command
   */
  constructor(private readonly noticesController: NoticesController) {
    this.command = 'acknowledge <notice-id>';
    this.describe = 'Acknowledges a notice';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: NoticesAcknowledgeCommandOptionsKebabCase,
  ): Promise<void> => {
    const noticeId = args['notice-id'];
    await this.noticesController.acknowledge(noticeId);
    printer.print(`Notice ${noticeId} has been acknowledged.`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<NoticesAcknowledgeCommandOptionsKebabCase> => {
    return yargs
      .version(false)
      .positional('notice-id', {
        describe: 'Id of the notice',
        type: 'string',
        demandOption: true,
      })
      .help();
  };
}
