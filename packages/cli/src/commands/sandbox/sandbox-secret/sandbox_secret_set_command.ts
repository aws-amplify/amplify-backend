import { Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import {
  AmplifyPrompter,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

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
    private readonly sandboxIdResolver: SandboxIdResolver,
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
    const backendId = await this.sandboxIdResolver.resolve();
    await this.secretClient.setSecret(
      new SandboxBackendIdentifier(backendId),
      args['secret-name'],
      secretVal
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretSetCommandOptions> => {
    return yargs.positional('secret-name', {
      describe: 'Name of the secret to set',
      type: 'string',
      demandOption: true,
    });
  };
}

type SecretSetCommandOptions =
  ArgumentsKebabCase<SecretSetCommandOptionsCamelCase>;

type SecretSetCommandOptionsCamelCase = {
  secretName: string;
};
