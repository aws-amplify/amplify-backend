import { Argv, CommandModule } from 'yargs';

/**
 * Root command to configure Amplify.
 */
export class ConfigureCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Root command to configure Amplify.
   */
  constructor(private readonly configureSubCommands: CommandModule[]) {
    this.command = 'configure <command>';
    this.describe = 'Configure AWS Amplify';
  }

  /**
   * @inheritDoc
   */
  handler = (): void => {
    // no-op for non-terminal command.
    return;
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).command(this.configureSubCommands).help();
  };
}
