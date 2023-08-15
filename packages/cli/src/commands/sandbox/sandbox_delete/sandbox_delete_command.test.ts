import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test_utils/command_runner.js';
import assert from 'node:assert';
import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { SandboxCommand } from '../sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';

describe('sandbox delete command', () => {
  let commandRunner: TestCommandRunner;
  let sandboxDeleteMock = mock.fn();

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(() =>
      Promise.resolve('testAppId')
    );
    const sandbox = await sandboxFactory.getInstance();
    sandboxDeleteMock = mock.method(sandbox, 'delete', () =>
      Promise.resolve()
    ) as never; // couldn't figure out a good way to type the sandboxDeleteMock so that TS was happy here

    const sandboxDeleteCommand = new SandboxDeleteCommand(sandboxFactory);

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      sandboxDeleteCommand
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    sandboxDeleteMock.mock.resetCalls();
  });

  it('deletes sandbox after confirming with user', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
    );
    await commandRunner.runCommand('sandbox delete');

    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
    assert.deepStrictEqual(sandboxDeleteMock.mock.calls[0].arguments[0], {
      name: undefined,
    });
  });

  it('deletes sandbox with user provided name', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
    );
    await commandRunner.runCommand('sandbox delete --name test-App-Name');

    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
    assert.deepStrictEqual(sandboxDeleteMock.mock.calls[0].arguments[0], {
      name: 'test-App-Name',
    });
  });

  it('does not delete sandbox if user said no', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(false)
    );
    await commandRunner.runCommand('sandbox delete');

    assert.equal(sandboxDeleteMock.mock.callCount(), 0);
  });

  it('deletes sandbox without confirming from user if a yes flag is given', async () => {
    await commandRunner.runCommand('sandbox delete --yes');
    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox delete --help');
    assert.match(output, /--yes/);
    assert.match(output, /--name/);
    assert.doesNotMatch(output, /--exclude/);
    assert.doesNotMatch(output, /--dirToWatch/);
  });
});
