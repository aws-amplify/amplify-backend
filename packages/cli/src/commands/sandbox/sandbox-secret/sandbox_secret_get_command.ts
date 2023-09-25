import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SANDBOX_BRANCH } from './constants.js';
import { Printer } from '../../printer/printer.js';

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
    private readonly sandboxIdResolver: SandboxIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'get <secretName>';
    this.describe = 'Get a sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SecretGetCommandOptions>
  ): Promise<void> => {
    const backendId = await this.sandboxIdResolver.resolve();
    const secret = await this.secretClient.getSecret(
      { backendId, branchName: SANDBOX_BRANCH },
      { name: args.secretName }
    );
    if (secret) {
      Printer.printRecord(secret);
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretGetCommandOptions> => {
    return yargs
      .positional('secretName', {
        describe: 'Name of the secret to get',
        type: 'string',
        demandOption: true,
      })
      .help();
  };
}

type SecretGetCommandOptions = {
  secretName: string;
};
