import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { SandboxCommand } from '../sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { createSandboxSecretCommand } from '../sandbox-secret/sandbox_secret_command_factory.js';
import { ClientConfigGeneratorAdapter } from '../../../client-config/client_config_generator_adapter.js';

void describe('sandbox delete command', () => {
  let commandRunner: TestCommandRunner;
  let sandboxDeleteMock = mock.fn();

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(() =>
      Promise.resolve('testBackendId')
    );
    const sandbox = await sandboxFactory.getInstance();
    sandboxDeleteMock = mock.method(sandbox, 'delete', () =>
      Promise.resolve()
    ) as never; // couldn't figure out a good way to type the sandboxDeleteMock so that TS was happy here

    const clientConfigGeneratorAdapterMock =
      {} as unknown as ClientConfigGeneratorAdapter;

    const sandboxDeleteCommand = new SandboxDeleteCommand(sandboxFactory);
    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [sandboxDeleteCommand, createSandboxSecretCommand()],
      clientConfigGeneratorAdapterMock
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    sandboxDeleteMock.mock.resetCalls();
  });

  void it('deletes sandbox after confirming with user', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
    );
    await commandRunner.runCommand('sandbox delete');

    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
    assert.deepStrictEqual(sandboxDeleteMock.mock.calls[0].arguments[0], {
      name: undefined,
    });
  });

  void it('deletes sandbox with user provided name', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
    );
    await commandRunner.runCommand('sandbox delete --name test-App-Name');

    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
    assert.deepStrictEqual(sandboxDeleteMock.mock.calls[0].arguments[0], {
      name: 'test-App-Name',
    });
  });

  void it('does not delete sandbox if user said no', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(false)
    );
    await commandRunner.runCommand('sandbox delete');

    assert.equal(sandboxDeleteMock.mock.callCount(), 0);
  });

  void it('deletes sandbox without confirming from user if a yes flag is given', async () => {
    await commandRunner.runCommand('sandbox delete --yes');
    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox delete --help');
    assert.match(output, /--yes/);
    assert.match(output, /--name/);
    assert.doesNotMatch(output, /--exclude/);
    assert.doesNotMatch(output, /--dir-to-watch/);
  });
});
