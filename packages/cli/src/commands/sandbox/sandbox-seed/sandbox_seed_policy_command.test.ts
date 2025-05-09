import { after, before, describe, it, mock } from 'node:test';
import fsp from 'fs/promises';
import * as path from 'path';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { printer } from '@aws-amplify/cli-core';
import { CommandMiddleware } from '../../../command_middleware.js';
import { SandboxSeedGeneratePolicyCommand } from './sandbox_seed_policy_command.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { generateSeedPolicyTemplate } from '../../../seed-policy-generation/generate_seed_policy_template.js';

const seedFileContents = 'console.log(`seed has been run`);';

const testBackendNameSpace = 'testSandboxId';
const testSandboxName = 'testSandboxName';

const testBackendId: BackendIdentifier = {
  namespace: testBackendNameSpace,
  name: testSandboxName,
  type: 'sandbox',
};

void describe('sandbox policy seed command', () => {
  let commandRunner: TestCommandRunner;

  const commandMiddleware = new CommandMiddleware(printer);
  const mockHandleProfile = mock.method(
    commandMiddleware,
    'ensureAwsCredentialAndRegion',
    () => null,
  );

  let amplifySeedDir: string;
  let fullPath: string;

  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: () => Promise.resolve(testBackendId),
  } as SandboxBackendIdResolver;

  const seedPolicyMock = mock.fn(
    generateSeedPolicyTemplate,
    (): Promise<PolicyDocument> =>
      Promise.resolve(
        new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminAddUserToGroup',
              ],
              resources: ['test-arn'],
            }),
          ],
        }),
      ),
  );

  before(async () => {
    const sandboxSeedGeneratePolicyCommand =
      new SandboxSeedGeneratePolicyCommand(sandboxIdResolver, seedPolicyMock);

    const parser = yargs().command(
      sandboxSeedGeneratePolicyCommand as unknown as CommandModule,
    );
    commandRunner = new TestCommandRunner(parser);
    mockHandleProfile.mock.resetCalls();

    await fsp.mkdir(path.join(process.cwd(), 'amplify', 'seed'), {
      recursive: true,
    });

    amplifySeedDir = path.join(process.cwd(), 'amplify');
    fullPath = path.join(process.cwd(), 'amplify', 'seed', 'seed.ts');
    await fsp.writeFile(fullPath, seedFileContents, 'utf8');
  });

  after(async () => {
    await fsp.rm(amplifySeedDir, { recursive: true, force: true });
    if (process.env.AMPLIFY_BACKEND_IDENTIFIER) {
      delete process.env.AMPLIFY_BACKEND_IDENTIFIER;
    }
  });

  void it('runs seed policy command without identifier', async () => {
    const output = await commandRunner.runCommand(
      'sandbox seed generate-policy',
    );

    assert.ok(output !== undefined);
  });

  void it('runs seed policy command with identifier', async () => {
    const output = await commandRunner.runCommand(
      'sandbox seed generate-policy --identifier app-name',
    );

    assert.ok(output !== undefined);
  });
});
