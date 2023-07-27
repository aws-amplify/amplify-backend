import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test_utils/command_runner.js';
import assert from 'node:assert';
import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { SandboxCommand } from '../sandbox_command.js';
import { SandboxFactory } from '@aws-amplify/sandbox';

describe('sandbox delete command', () => {
  const sandbox = SandboxFactory.createCDKSandbox('testAppName', 'test1234');
  const sandboxDeleteMock = mock.method(sandbox, 'delete', () => {
    return Promise.resolve();
  });

  const sandboxDeleteCommand = new SandboxDeleteCommand(sandbox);

  const sandboxCommand = new SandboxCommand(sandbox, sandboxDeleteCommand);
  const parser = yargs().command(sandboxCommand as unknown as CommandModule);
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    sandboxDeleteMock.mock.resetCalls();
  });

  it('deletes sandbox after confirming with user', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () => {
      return Promise.resolve(true);
    });
    await commandRunner.runCommand('sandbox delete');

    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
  });

  it('does not delete sandbox if user said no', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () => {
      return Promise.resolve(false);
    });
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
    assert.doesNotMatch(output, /--exclude/);
    assert.doesNotMatch(output, /--dirToWatch/);
  });
});
