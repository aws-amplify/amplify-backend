import { after, before, describe, it, mock } from 'node:test';
import fsp from 'fs/promises';
import fs from 'fs';
import * as path from 'path';
import { SandboxSeedCommand } from './sandbox_seed_command.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
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

const seedFileContents = 'console.log(`seed has been run`);';

const testBackendNameSpace = 'testSandboxId';
const testSandboxName = 'testSandboxName';

const testBackendId: BackendIdentifier = {
  namespace: testBackendNameSpace,
  name: testSandboxName,
  type: 'sandbox',
};

//const testBackendIdStr = 'testBackendId';

void describe('sandbox seed command', () => {
  let commandRunner: TestCommandRunner;

  const clientConfigGenerationMock = mock.fn<EventHandler>();
  const clientConfigDeletionMock = mock.fn<EventHandler>();

  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: clientConfigGenerationMock,
  } as unknown as ClientConfigGeneratorAdapter;

  const commandMiddleware = new CommandMiddleware(printer);
  let amplifySeedDir: string;
  let fullPath: string;

  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: () => Promise.resolve(testBackendId),
  } as SandboxBackendIdResolver;

  before(async () => {
    const sandboxFactory = new SandboxSingletonFactory(
      () => Promise.resolve(testBackendId),
      printer,
      format
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
      })
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
  });

  void describe('seed script exists', () => {
    before(async () => {
      await fsp.mkdir(path.join(process.cwd(), 'amplify', 'seed'), {
        recursive: true,
      });
      amplifySeedDir = path.join(process.cwd(), 'amplify');
      fullPath = path.join(process.cwd(), 'amplify', 'seed', 'seed.ts');
      await fsp.writeFile(fullPath, seedFileContents, 'utf8');
    });

    after(async () => {
      await fsp.rm(amplifySeedDir, { recursive: true, force: true });
      if (process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
        delete process.env.AMPLIFY_SANDBOX_IDENTIFIER;
      }
    });

    void it('runs seed if seed script is found', async () => {
      const fsOpenSyncMock = mock.method(fs, 'openSync');
      await commandRunner.runCommand('sandbox seed');

      assert.equal(fsOpenSyncMock.mock.callCount(), 1);
      mock.restoreAll();
    });

    // TO DO: should have a test to see if backendID is set, that will need to happen while seed command is running
  });

  void describe('seed script does not exist', () => {
    before(async () => {
      await fsp.mkdir(path.join(process.cwd(), 'amplify', 'seed'), {
        recursive: true,
      });
      amplifySeedDir = path.join(process.cwd(), 'amplify');
    });

    after(async () => {
      await fsp.rm(amplifySeedDir, { recursive: true, force: true });
      if (process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
        delete process.env.AMPLIFY_SANDBOX_IDENTIFIER;
      }
    });

    void it('throws error if seed script does not exist', async () => {
      await assert.rejects(
        () => commandRunner.runCommand('sandbox seed'),
        (err: TestCommandError) => {
          // file differences between Unix and Windows makes it tricky to add the path
          assert.match(err.output, /SeedScriptNotFoundError/);
          assert.match(err.output, /There is no file that corresponds to/);
          assert.match(
            err.output,
            /Please make a file that corresponds to (.*) and put your seed logic in it/
          );
          return true;
        }
      );
    });
  });
});
