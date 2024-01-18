import { Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { printer } from '../../../printer.js';

/**
 * Command to get sandbox secret.
 */
export class SandboxSecretGetCommand
  implements CommandModule<object, SecretGetCommandOptions>
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
   * Get sandbox secret command.
   */
  constructor(
    private readonly sandboxIdResolver: SandboxBackendIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'get <secret-name>';
    this.describe = 'Get a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: SecretGetCommandOptions): Promise<void> => {
    const sandboxBackendIdentifier = await this.sandboxIdResolver.resolve();
    const secret = await this.secretClient.getSecret(sandboxBackendIdentifier, {
      name: args['secret-name'],
    });
    printer.printRecord(secret);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretGetCommandOptions> => {
    return yargs
      .positional('secret-name', {
        describe: 'Name of the secret to get',
        type: 'string',
        demandOption: true,
      })
      .help();
  };
}

type SecretGetCommandOptions =
  ArgumentsKebabCase<SecretGetCommandOptionsCamelCase>;

type SecretGetCommandOptionsCamelCase = {
  secretName: string;
};
