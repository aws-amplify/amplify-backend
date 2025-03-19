import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';

import { NoticesListCommand } from './notices_list_command.js';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesPrinter } from '../../notices/notices_printer.js';
import { Notice } from '@aws-amplify/cli-core';

void describe('notices list command', () => {
  const testNotices: Array<Notice> = [
    {
      id: '1',
      title: 'test title',
      details: 'test details',
      predicates: [],
    },
  ];

  const mockNoticesController = {
    getApplicableNotices: mock.fn<NoticesController['getApplicableNotices']>(
      async () => testNotices,
    ),
  };
  const mockNoticesPrinter = {
    print: mock.fn<NoticesPrinter['print']>(),
  };

  const noticesListCommand = new NoticesListCommand(
    mockNoticesController as unknown as NoticesController,
    mockNoticesPrinter as unknown as NoticesPrinter,
  );

  const parser = yargs().command(
    noticesListCommand as unknown as CommandModule,
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    mockNoticesController.getApplicableNotices.mock.resetCalls();
    mockNoticesPrinter.print.mock.resetCalls();
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(
      output,
      /Displays active notices relevant to your Amplify backend environment./,
    );
  });

  void it('lists notices', async () => {
    await commandRunner.runCommand('list');
    assert.strictEqual(
      mockNoticesController.getApplicableNotices.mock.calls.length,
      1,
    );
    assert.deepStrictEqual(
      mockNoticesController.getApplicableNotices.mock.calls[0].arguments,
      [
        {
          event: 'listing',
          includeAcknowledged: undefined,
        },
      ],
    );
    assert.strictEqual(mockNoticesPrinter.print.mock.calls.length, 1);
    assert.deepStrictEqual(mockNoticesPrinter.print.mock.calls[0].arguments, [
      testNotices,
    ]);
  });

  void it('lists all notices', async () => {
    await commandRunner.runCommand('list --all');
    assert.strictEqual(
      mockNoticesController.getApplicableNotices.mock.calls.length,
      1,
    );
    assert.deepStrictEqual(
      mockNoticesController.getApplicableNotices.mock.calls[0].arguments,
      [
        {
          event: 'listing',
          includeAcknowledged: true,
        },
      ],
    );
    assert.strictEqual(mockNoticesPrinter.print.mock.calls.length, 1);
    assert.deepStrictEqual(mockNoticesPrinter.print.mock.calls[0].arguments, [
      testNotices,
    ]);
  });
});
