import { Argv, CommandModule } from 'yargs';
import { printer } from '@aws-amplify/cli-core';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { generateSeedPolicyTemplate } from '../../../seed-policy-generation/generate_seed_policy_template.js';

/**
 *
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
   * Seeds sandbox environment.
   */
  constructor() {
    this.command = 'seed generate-policy';
    this.describe = 'Generates policy for seeding based on outputs';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const backendId = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();
    const policyDocument = await generateSeedPolicyTemplate(backendId);
    printer.print(policyDocument);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs;
  };
}
