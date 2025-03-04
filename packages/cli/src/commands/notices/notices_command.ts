import { Argv, CommandModule } from 'yargs';
import { printer } from '@aws-amplify/cli-core';
import { NoticesController } from '../../notices/notices_controller.js';

/**
 * Notices command.
 */
export class NoticesCommand implements CommandModule<object> {
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
    this.command = 'notices';
    this.describe = 'Displays a list of relevant notices';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const notices = await this.noticesController.getApplicableNotices();
    printer.print(JSON.stringify(notices, null, 2));
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).help();
  };
}
