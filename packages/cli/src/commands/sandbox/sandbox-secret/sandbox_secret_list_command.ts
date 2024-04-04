import { ArgumentsCamelCase, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { format, printer } from '@aws-amplify/cli-core';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';

/**
 * Command to list sandbox secrets.
 */
export class SandboxSecretListCommand
  implements
    CommandModule<object, ArgumentsKebabCase<SandboxCommandGlobalOptions>>
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
   * List sandbox secret command.
   */
  constructor(
    private readonly sandboxIdResolver: SandboxBackendIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'list';
    this.describe = 'List all sandbox secrets';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxCommandGlobalOptions>
  ): Promise<void> => {
    const sandboxBackendIdentifier = await this.sandboxIdResolver.resolve(
      args.identifier
    );
    const secrets = await this.secretClient.listSecrets(
      sandboxBackendIdentifier
    );

    if (secrets.length > 0) {
      printer.print(format.list(secrets.map((secret) => secret.name)));
    } else {
      printer.print(
        `No sandbox secrets found. To create a secret use ${format.command(
          'amplify sandbox secret set <secret-name>'
        )}.`
      );
    }
    printer.printNewLine();
  };
}
