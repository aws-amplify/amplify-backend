import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';

import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesAcknowledgeCommand } from './notices_acknowledge_command.js';

void describe('notices list command', () => {
  const mockNoticesController = {
    acknowledge: mock.fn<NoticesController['acknowledge']>(),
  };

  const noticesAcknowledgeCommand = new NoticesAcknowledgeCommand(
    mockNoticesController as unknown as NoticesController,
  );

  const parser = yargs().command(
    noticesAcknowledgeCommand as unknown as CommandModule,
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    mockNoticesController.acknowledge.mock.resetCalls();
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('acknowledge --help');
    assert.match(output, /Mark a specific notice as acknowledged/);
  });

  void it('acknowledges notice', async () => {
    const noticeId = '1234';
    await commandRunner.runCommand(`acknowledge ${noticeId}`);
    assert.strictEqual(mockNoticesController.acknowledge.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockNoticesController.acknowledge.mock.calls[0].arguments,
      [noticeId],
    );
  });

  void it('fails if notice id is missing', async () => {
    const output = await commandRunner.runCommand(`acknowledge`);
    assert.strictEqual(mockNoticesController.acknowledge.mock.calls.length, 0);
    assert.match(output, /Not enough non-option arguments/);
  });
});
