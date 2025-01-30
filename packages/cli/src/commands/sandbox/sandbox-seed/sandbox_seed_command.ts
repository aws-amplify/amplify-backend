import { Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { STSClient /*, AssumeRoleCommand*/ } from '@aws-sdk/client-sts';
//import { randomUUID } from 'crypto';

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
  constructor(private readonly stsClient = new STSClient()) {
    this.command = 'seed';
    this.describe = 'Seeds sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const backendID = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();
    /*
    const assumeRoleResponse = await this.stsClient.send(new AssumeRoleCommand({
      RoleSessionName: randomUUID(),
      RoleArn: 'TO DO: figure out how to get seed role arn'
    }));
    */
    //most of this comes from the initial POC for seed, changed filepath to be more inline with discussions that have happened since then
    const seedPath = path.join('seed.ts');
    await execa('tsx', [seedPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        AMPLIFY_SANDBOX_IDENTIFIER: JSON.stringify(backendID),
        //AWS_ACCESS_KEY_ID: assumeRoleResponse.Credentials?.AccessKeyId,
        //AWS_SECRET_ACCESS_KEY: assumeRoleResponse.Credentials?.SecretAccessKey,
        //AWS_SESSION_TOKEN: assumeRoleResponse.Credentials?.SessionToken,
      },
    });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs.check(() => {
      //TO DO: seed path may need to be more flexible or be in a different place -- or name may need to change
      const seedPath = path.join(process.cwd(), 'seed.ts');
      if (!existsSync(seedPath)) {
        throw new Error(`${seedPath} must exist`);
      }
      return true;
    });
  };
}
