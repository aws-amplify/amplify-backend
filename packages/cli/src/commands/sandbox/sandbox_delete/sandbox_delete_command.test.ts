import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test_utils/command_runner.js';
import assert from 'node:assert';
import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { createSandboxDeleteCommand } from './sandbox_delete_command_factory.js';
import { SandboxCommand } from '../sandbox_command.js';
import { sandbox } from '@aws-amplify/sandbox';

describe('sandbox delete command factory', () => {
  it('instantiate a sandbox delete command correctly', () => {
    assert.ok(createSandboxDeleteCommand() instanceof SandboxDeleteCommand);
  });
});

describe('sandbox delete command', () => {
  const sandboxDeleteMock = mock.method(sandbox, 'delete', () => {
    return Promise.resolve();
  });

  const sandbox_delete_command = new SandboxDeleteCommand();

  const sandboxCommand = new SandboxCommand(sandbox_delete_command);
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
