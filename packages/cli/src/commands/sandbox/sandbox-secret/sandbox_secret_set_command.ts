import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SANDBOX_BRANCH } from './constants.js';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';

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
    const secretVal = await AmplifyPrompter.nonEmptySecretValue();
    const backendId = await this.sandboxIdResolver.resolve();
    if (args.secretName) {
      const resp = await this.secretClient.setSecret(
        { backendId, branchName: SANDBOX_BRANCH },
        args.secretName,
        secretVal
      );
      console.log(resp);
    } else {
      throw new Error('empty secret name');
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SecretSetCommandOptions> => {
    return yargs
      .positional('secretName', {
        describe: 'Name of the secret to set',
        type: 'string',
      })
      .check((argv) => {
        if (!argv.secretName) {
          throw new Error(`secret name is undefined.`);
        }
        return true;
      });
  };
}

type SecretSetCommandOptions = {
  secretName: string | undefined;
};
