import { CommandModule } from 'yargs';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SANDBOX_BRANCH } from './constants.js';
import { Printer } from '../../printer/printer.js';

/**
 * Command to list sandbox secrets.
 */
export class SandboxSecretListCommand implements CommandModule<object> {
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
    private readonly sandboxIdResolver: SandboxIdResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'list';
    this.describe = 'List all sandbox secrets';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const backendId = await this.sandboxIdResolver.resolve();
    const secretIds = await this.secretClient.listSecrets({
      backendId,
      branchName: SANDBOX_BRANCH,
    });
    Printer.printRecords(secretIds);
  };
}
