import { Argv, CommandModule } from 'yargs';
import { SandboxSecretSetCommand } from './sandbox_secret_set_command.js';
import { SandboxSecretGetCommand } from './sandbox_secret_get_command.js';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SecretClient } from '@aws-amplify/backend-secret';

/**
 * Root command to manage sandbox secret.
 */
export class SandboxSecretCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  private readonly createCommand: SandboxSecretSetCommand;
  private readonly getCommand: SandboxSecretGetCommand;
  private readonly removeCommand: SandboxSecretRemoveCommand;
  private readonly listCommand: SandboxSecretListCommand;

  /**
   * Root command to manage sandbox secret
   */
  constructor(
    sandboxIdResolver: SandboxIdResolver,
    secretClient: SecretClient
  ) {
    this.createCommand = new SandboxSecretSetCommand(
      sandboxIdResolver,
      secretClient
    );
    this.removeCommand = new SandboxSecretRemoveCommand(
      sandboxIdResolver,
      secretClient
    );
    this.getCommand = new SandboxSecretGetCommand(
      sandboxIdResolver,
      secretClient
    );
    this.listCommand = new SandboxSecretListCommand(
      sandboxIdResolver,
      secretClient
    );
    this.command = 'secret <command>';
    this.describe = 'Manage sandbox secret';
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
    return (
      yargs
        .command(this.createCommand as unknown as CommandModule)
        .command(this.removeCommand as unknown as CommandModule)
        .command(this.getCommand as unknown as CommandModule)
        .command(this.listCommand)
        // Hide inherited options since they are not applicable here.
        .option('dirToWatch', {
          hidden: true,
        })
        .option('exclude', {
          hidden: true,
        })
        .option('name', {
          hidden: true,
        })
        .option('out', {
          hidden: true,
        })
        .help()
    );
  };
}
