import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { format, printer } from '@aws-amplify/cli-core';
import { SandboxCommandGlobalOptions } from '../option_types.js';

/**
 * Command to get sandbox secret.
 */
export class SandboxSecretGetCommand
  implements CommandModule<object, SecretGetCommandOptionsKebabCase>
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
  handler = async (
    args: ArgumentsCamelCase<SecretGetCommandOptionsKebabCase>
  ): Promise<void> => {
    const sandboxBackendIdentifier = await this.sandboxIdResolver.resolve(
      args.identifier
    );
    const secret = await this.secretClient.getSecret(sandboxBackendIdentifier, {
      name: args.secretName,
    });
    printer.print(format.record(secret));
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretGetCommandOptionsKebabCase> => {
    return yargs
      .positional('secret-name', {
        describe: 'Name of the secret to get',
        type: 'string',
        demandOption: true,
      })
      .help();
  };
}

type SecretGetCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    secretName: string;
  } & SandboxCommandGlobalOptions
>;
