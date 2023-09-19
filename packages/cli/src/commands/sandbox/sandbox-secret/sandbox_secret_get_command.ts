import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SANDBOX_BRANCH } from './constants.js';

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
    if (args.secretName) {
      const resp = await this.secretClient.getSecret(
        { backendId, branchName: SANDBOX_BRANCH },
        { name: args.secretName }
      );
      console.log(resp);
    } else {
      throw new Error('empty secret name');
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
      })
      .check((argv) => {
        if (!argv.secretName) {
          throw new Error(`secret name is undefined`);
        }
        return true;
      })
      .help();
  };
}

type SecretGetCommandOptions = {
  secretName: string | undefined;
};
