import { Argv, CommandModule } from 'yargs';
import { printer } from '@aws-amplify/cli-core';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { generateSeedPolicyTemplate } from '../../../seed-policy-generation/generate_seed_policy_template.js';

/**
 * Command that generates policy template with permissions to be able to run seed in sandbox environment
 */
export class SandboxSeedGeneratePolicyCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Generates policy to run seed, is a subcommand of seed
   */
  constructor(private readonly backendIdResolver: SandboxBackendIdResolver) {
    this.command = 'generate-policy';
    this.describe = 'Generates policy for seeding based on outputs';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const backendId = await this.backendIdResolver.resolve();
    const policyDocument = await generateSeedPolicyTemplate(backendId);
    printer.print(JSON.stringify(policyDocument.toJSON(), null, 1));
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs;
  };
}
