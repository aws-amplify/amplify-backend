import { Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { handleCommandFailure } from '../../../command_failure_handler.js';

/**
 * Command to set sandbox secret.
 */
export class SandboxSecretSetCommand
  implements CommandModule<object, SecretSetCommandOptions>
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
   * Set sandbox secret command.
   */
  constructor(
    private readonly sandboxIdResolver: SandboxBackendIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'set <secretName>';
    this.describe = 'Set a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: SecretSetCommandOptions): Promise<void> => {
    const secretVal = await AmplifyPrompter.secretValue();
    await this.secretClient.setSecret(
      await this.sandboxIdResolver.resolve(),
      args['secret-name'],
      secretVal
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretSetCommandOptions> => {
    return yargs
      .positional('secret-name', {
        describe: 'Name of the secret to set',
        type: 'string',
        demandOption: true,
      })
      .fail((msg, err) => {
        handleCommandFailure(msg, err, yargs);
        yargs.exit(1, err);
      });
  };
}

type SecretSetCommandOptions =
  ArgumentsKebabCase<SecretSetCommandOptionsCamelCase>;

type SecretSetCommandOptionsCamelCase = {
  secretName: string;
};
