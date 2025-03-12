import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { printer } from '@aws-amplify/cli-core';
import { AmplifyUserError } from '@aws-amplify/platform-core';

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
    this.command = 'remove [secret-name]';
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
    if (args.secretName) {
      await this.secretClient.removeSecret(
        sandboxBackendIdentifier,
        args.secretName
      );
      printer.print(`Successfully removed secret ${args.secretName}`);
    } else if (args.all) {
      const secrets = await this.secretClient.listSecrets(
        sandboxBackendIdentifier
      );
      const names = secrets.map((secret) => secret.name);
      await this.secretClient.removeSecrets(sandboxBackendIdentifier, names);
      printer.print('Successfully removed all secrets');
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretRemoveCommandOptionsKebabCase> => {
    return yargs
      .option('all', {
        describe: 'Remove all secrets',
        type: 'boolean',
        conflicts: ['secret-name'],
      })
      .positional('secret-name', {
        describe: 'Name of the secret to remove',
        type: 'string',
        demandOption: false,
      })
      .check((argv) => {
        if (!argv.all && !argv['secret-name']) {
          throw new AmplifyUserError('InvalidCommandInputError', {
            message: 'Either secret-name or all flag must be provided',
            resolution: 'Provide either secret-name or all flag',
          });
        }
        return true;
      });
  };
}

type SecretRemoveCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    secretName: string | undefined;
    /**
     * Optional flag to remove all secrets.
     */
    all?: boolean;
  } & SandboxCommandGlobalOptions
>;
