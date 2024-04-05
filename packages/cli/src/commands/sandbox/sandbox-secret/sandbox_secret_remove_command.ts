import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';

/**
 * Command to remove sandbox secret.
 */
export class SandboxSecretRemoveCommand
  implements CommandModule<object, SecretRemoveCommandOptionsKebabCase>
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
    private readonly sandboxIdResolver: SandboxBackendIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'remove <secret-name>';
    this.describe = 'Remove a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SecretRemoveCommandOptionsKebabCase>
  ): Promise<void> => {
    const sandboxBackendIdentifier = await this.sandboxIdResolver.resolve(
      args.identifier
    );
    await this.secretClient.removeSecret(
      sandboxBackendIdentifier,
      args.secretName
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretRemoveCommandOptionsKebabCase> => {
    return yargs.positional('secret-name', {
      describe: 'Name of the secret to remove',
      type: 'string',
      demandOption: true,
    });
  };
}

type SecretRemoveCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    secretName: string;
  } & SandboxCommandGlobalOptions
>;
