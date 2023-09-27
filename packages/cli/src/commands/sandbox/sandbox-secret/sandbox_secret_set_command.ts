import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
import { Printer } from '../../printer/printer.js';
import { SandboxBackendIdentifier } from '@aws-amplify/plugin-core';

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
  handler = async (
    args: ArgumentsCamelCase<SecretSetCommandOptions>
  ): Promise<void> => {
    const secretVal = await AmplifyPrompter.secretValue();
    const backendId = await this.sandboxIdResolver.resolve();
    const secretId = await this.secretClient.setSecret(
      new SandboxBackendIdentifier(backendId),
      args.secretName,
      secretVal
    );
    Printer.printRecord(secretId);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretSetCommandOptions> => {
    return yargs.positional('secretName', {
      describe: 'Name of the secret to set',
      type: 'string',
      demandOption: true,
    });
  };
}

type SecretSetCommandOptions = {
  secretName: string;
};
