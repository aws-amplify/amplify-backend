import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SANDBOX_BRANCH } from './constants.js';

/**
 * Command to remove sandbox secret.
 */
export class SandboxSecretRemoveCommand
  implements CommandModule<object, SecretRemoveCommandOptions>
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
   * Remove sandbox secret command.
   */
  constructor(
    private readonly sandboxIdResolver: SandboxIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'remove <secretName>';
    this.describe = 'Remove a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SecretRemoveCommandOptions>
  ): Promise<void> => {
    const backendId = await this.sandboxIdResolver.resolve();
    if (args.secretName) {
      await this.secretClient.removeSecret(
        {
          backendId,
          branchName: SANDBOX_BRANCH,
        },
        args.secretName
      );
    } else {
      throw new Error('empty secret name');
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretRemoveCommandOptions> => {
    return yargs.positional('secretName', {
      describe: 'Name of the secret to remove',
      type: 'string',
      demandOption: true,
    });
  };
}

type SecretRemoveCommandOptions = {
  secretName: string | undefined;
};
