import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { existsSync } from 'fs';
import path from 'path';
import { execa } from 'execa';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { randomUUID } from 'crypto';

export type SandboxSeedCommandOptionsKebabCase = ArgumentsKebabCase<{
  local: boolean | undefined;
}>;

/**
 * Command to seed sandbox.
 */
export class SandboxSeedCommand
  implements CommandModule<object, SandboxSeedCommandOptionsKebabCase>
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
   * Root command to manage sandbox secret
   */
  constructor(
    private readonly backendIdentifierResolver: BackendIdentifierResolver,
    private readonly backendOutputClientBuilder: () => BackendOutputClient,
    private readonly lambdaClient: LambdaClient,
    private readonly stsClient = new STSClient()
  ) {
    this.command = 'seed';
    this.describe = 'Seed sandbox with data';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxSeedCommandOptionsKebabCase>
  ): Promise<void> => {
    // TODO alternative considered:
    // Other option was to have seed.ts export a function but it causes the following problems:
    // 1. In order to load it dynamically it must be compiled to js
    // 2. It may import backend.ts for dynamic typing, that import makes TSC compile whole graph
    // 3. Pointing tsc to seed.ts makes it hard/impossible to properly honor tsconfig.json (same problems we had when discussing what to do with tsconfig.json in amplify folder.
    //
    // Therefore the POC pivots here to make the script self contained and executable with tsx.
    const backendId = await this.backendIdentifierResolver.resolve({});
    const backendOutputs = await this.backendOutputClientBuilder().getOutput(
      backendId!
    );
    if (args.local) {
      const assumeRoleResponse = await this.stsClient.send(new AssumeRoleCommand({
        RoleSessionName: randomUUID(),
        RoleArn: backendOutputs['AWS::Amplify::Platform']?.payload.seedRoleArn,
      }));
      //console.log(JSON.stringify(assumeRoleResponse , null, 2));
      const seedPath = path.join('amplify', 'seed.ts');
      await execa('tsx', [seedPath], { cwd: process.cwd(), stdio: 'inherit', env: {
          AWS_ACCESS_KEY_ID: assumeRoleResponse.Credentials!.AccessKeyId,
          AWS_SECRET_ACCESS_KEY:  assumeRoleResponse.Credentials!.SecretAccessKey,
          AWS_SESSION_TOKEN:  assumeRoleResponse.Credentials!.SessionToken,
        } });
    } else {
      // Another pivot: use lambda.

      //console.log(JSON.stringify(backendOutputs, null, 2));
      const lambdaArn =
        backendOutputs['AWS::Amplify::Platform']?.payload.seedFunctionArn;

      if (!lambdaArn) {
        throw new Error('No seed lambda');
      }

      const invokeResponse = await this.lambdaClient.send(
        new InvokeCommand({
          FunctionName: lambdaArn,
        })
      );
      //console.log(invokeResponse);
      if (invokeResponse.StatusCode !== 200) {
        throw new Error(
          `${invokeResponse.FunctionError}\n${invokeResponse.LogResult}`
        );
      }
    }

    return;
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxSeedCommandOptionsKebabCase> => {
    return yargs
      .option('local', {
        type: 'boolean',
      })
      .check(() => {
        const seedPath = path.join(process.cwd(), 'amplify', 'seed.ts');
        if (!existsSync(seedPath)) {
          throw new Error(`${seedPath} must exist`);
        }
        return true;
      });
  };
}
