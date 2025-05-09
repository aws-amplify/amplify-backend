import { before, describe, it, mock } from 'node:test';
import { SandboxSeedCommand } from './sandbox_seed_command.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { createSandboxSecretCommand } from '../sandbox-secret/sandbox_secret_command_factory.js';
import { EventHandler, SandboxCommand } from '../sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from '../sandbox-delete/sandbox_delete_command.js';
import { ClientConfigGeneratorAdapter } from '../../../client-config/client_config_generator_adapter.js';
import { format, printer } from '@aws-amplify/cli-core';
import { CommandMiddleware } from '../../../command_middleware.js';
import { SandboxSeedGeneratePolicyCommand } from './sandbox_seed_policy_command.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';

const testBackendNameSpace = 'testSandboxId';
const testSandboxName = 'testSandboxName';

const testBackendId: BackendIdentifier = {
  namespace: testBackendNameSpace,
  name: testSandboxName,
  type: 'sandbox',
};

void describe('sandbox seed command', () => {
  let commandRunner: TestCommandRunner;

  const clientConfigGenerationMock = mock.fn<EventHandler>();
  const clientConfigDeletionMock = mock.fn<EventHandler>();

  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: clientConfigGenerationMock,
  } as unknown as ClientConfigGeneratorAdapter;

  const commandMiddleware = new CommandMiddleware(printer);
  const mockHandleProfile = mock.method(
    commandMiddleware,
    'ensureAwsCredentialAndRegion',
    () => null,
  );

  const mockProfileResolver = mock.fn();

  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: () => Promise.resolve(testBackendId),
  } as SandboxBackendIdResolver;

  before(async () => {
    const sandboxFactory = new SandboxSingletonFactory(
      () => Promise.resolve(testBackendId),
      mockProfileResolver,
      printer,
      format,
    );

    const sandboxSeedCommand = new SandboxSeedCommand(sandboxIdResolver, [
      new SandboxSeedGeneratePolicyCommand(sandboxIdResolver),
    ]);

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [
        new SandboxDeleteCommand(sandboxFactory),
        createSandboxSecretCommand(),
        sandboxSeedCommand,
      ],
      clientConfigGeneratorAdapterMock,
      commandMiddleware,
      () => ({
        successfulDeployment: [clientConfigGenerationMock],
        successfulDeletion: [clientConfigDeletionMock],
        failedDeployment: [],
      }),
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    mockHandleProfile.mock.resetCalls();
  });

  void it('runs seed policy command without identifier', async () => {
    const output = await commandRunner.runCommand(
      'sandbox seed generate-policy',
    );

    assert.ok(output !== undefined);
    assert.strictEqual(mockHandleProfile.mock.callCount(), 1);
  });

  void it('runs seed policy command with identifier', async () => {
    const output = await commandRunner.runCommand(
      'sandbox seed generate-policy --identifier app-name',
    );

    assert.ok(output !== undefined);
    assert.strictEqual(mockHandleProfile.mock.callCount(), 1);
  });
});
