import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { once } from 'events';
import { ReadStream } from 'node:tty';

/**
 * Command to set sandbox secret.
 */
export class SandboxSecretSetCommand
  implements CommandModule<object, SecretSetCommandOptionsKebabCase>
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
    private readonly secretClient: SecretClient,
    private readonly readStream: ReadStream = process.stdin
  ) {
    this.command = 'set <secret-name>';
    this.describe = 'Set a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SecretSetCommandOptionsKebabCase>
  ): Promise<void> => {
    const secretValue = await this.readSecretValue();

    const secretIdentifier = await this.secretClient.setSecret(
      await this.sandboxIdResolver.resolve(args.identifier),
      args.secretName,
      secretValue
    );
    printer.print(
      `Successfully created version ${secretIdentifier.version} of secret ${secretIdentifier.name}`
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretSetCommandOptionsKebabCase> => {
    return yargs.positional('secret-name', {
      describe: 'Name of the secret to set',
      type: 'string',
      demandOption: true,
    });
  };

  /**
   * Prompt (or) read secret value from stdin based on terminal interactive mode
   */
  private readSecretValue = async (): Promise<string> => {
    let secretValue = '';
    if (this.readStream.isTTY) {
      // This input is for interactive mode.
      secretValue = await AmplifyPrompter.secretValue();
    } else {
      // This allows to accept secret value from redirected input `|` and `>`.
      this.readStream.on('readable', () => {
        const chunk = this.readStream.read();
        if (chunk !== null) {
          secretValue += chunk;
        }
      });
      // Wait for the end of the input.
      await once(this.readStream, 'end');
    }
    return secretValue;
  };
}

type SecretSetCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    secretName: string;
  } & SandboxCommandGlobalOptions
>;
