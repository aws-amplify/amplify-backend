import { CommandModule } from 'yargs';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
//import { BackendSeedIdScopedSsmEnvironmentEntriesGenerator } from '@aws-amplify/backend-seed';

/**
 *
 */
export class SandboxSeedCommand implements CommandModule<object> {
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
  constructor(private readonly sandboxFactory: SandboxSingletonFactory) {
    this.command = 'seed';
    this.describe = 'Seeds sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const sandboxID = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();

    /*const ssmEnvEntriesGenerator = new BackendSeedIdScopedSsmEnvironmentEntriesGenerator();
    ssmEnvEntriesGenerator.generateSsmEnvironmentEntries({
     ['SANDBOX_IDENTIFIER']: JSON.stringify(sandboxID),
    })
    */
    process.env.SANDBOX_IDENTIFIER = JSON.stringify(sandboxID);
    //eslint-disable-next-line no-console
    console.log(`Seeding is happening...`);
  };
}
