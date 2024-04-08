import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';

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
    private readonly secretClient: SecretClient
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
    const secretVal = await AmplifyPrompter.secretValue();
    await this.secretClient.setSecret(
      await this.sandboxIdResolver.resolve(args.identifier),
      args.secretName,
      secretVal
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
}

type SecretSetCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    secretName: string;
  } & SandboxCommandGlobalOptions
>;
