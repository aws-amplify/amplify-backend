import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { NoticesPrinter } from './notices_printer.js';
import { ConsolePrinter, Notice } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';

void describe('NoticesPrinter', () => {
  const mockPrinter = {
    print: mock.fn<ConsolePrinter['print']>(),
    printNewLine: mock.fn<ConsolePrinter['printNewLine']>(),
  };
  const mockPackageManagerController = {
    getCommand: mock.fn<PackageManagerController['getCommand']>((args) => {
      return args.join(' ');
    }),
  };
  let noticesPrinter: NoticesPrinter;

  beforeEach(() => {
    mockPrinter.print.mock.resetCalls();
    mockPrinter.printNewLine.mock.resetCalls();
    mockPackageManagerController.getCommand.mock.resetCalls();
    noticesPrinter = new NoticesPrinter(
      mockPackageManagerController as unknown as PackageManagerController,
      mockPrinter as unknown as ConsolePrinter,
    );
  });

  void it('should print notice details correctly', () => {
    const mockNotices: Array<Notice> = [
      {
        id: '1',
        title: 'Test notice title',
        details: 'Test notice details',
        link: 'https://test.link',
        predicates: [],
      },
    ];
    noticesPrinter.print(mockNotices);

    assert.equal(mockPrinter.printNewLine.mock.calls.length, 5);
    assert.deepEqual(mockPrinter.print.mock.calls[0].arguments, ['Notices:']);
    assert.deepEqual(mockPrinter.print.mock.calls[1].arguments, [
      '1\tTest notice title',
    ]);
    assert.deepEqual(mockPrinter.print.mock.calls[2].arguments, [
      '\tTest notice details',
    ]);
    assert.deepEqual(mockPrinter.print.mock.calls[3].arguments, [
      '\tMore information at: https://test.link',
    ]);
    assert.ok(
      mockPrinter.print.mock.calls[4].arguments[0].includes(
        "If you don't want to see a notice anymore, use",
      ),
    );
    assert.ok(
      mockPrinter.print.mock.calls[4].arguments[0].includes(
        'ampx notices acknowledge <notice-id>',
      ),
    );
  });

  void it('should print notice without link', () => {
    const mockNotices: Array<Notice> = [
      {
        id: '1',
        title: 'Test notice title',
        details: 'Test notice details',
        predicates: [],
      },
    ];
    noticesPrinter.print(mockNotices);

    assert.equal(mockPrinter.printNewLine.mock.calls.length, 4);
    assert.deepEqual(mockPrinter.print.mock.calls[0].arguments, ['Notices:']);
    assert.deepEqual(mockPrinter.print.mock.calls[1].arguments, [
      '1\tTest notice title',
    ]);
    assert.deepEqual(mockPrinter.print.mock.calls[2].arguments, [
      '\tTest notice details',
    ]);
    assert.ok(
      mockPrinter.print.mock.calls[3].arguments[0].includes(
        "If you don't want to see a notice anymore, use",
      ),
    );
    assert.ok(
      mockPrinter.print.mock.calls[3].arguments[0].includes(
        'ampx notices acknowledge <notice-id>',
      ),
    );
  });

  void it('should wrap text at 80 characters', () => {
    const longText =
      'This is a very long text that should be wrapped at exactly eighty characters to ensure proper formatting';

    const mockNotices: Array<Notice> = [
      {
        id: '1',
        title: 'Test notice title',
        details: longText,
        predicates: [],
      },
    ];
    noticesPrinter.print(mockNotices);

    assert.equal(mockPrinter.print.mock.calls.length, 5);
    assert.deepEqual(mockPrinter.print.mock.calls[0].arguments, ['Notices:']);
    assert.deepEqual(mockPrinter.print.mock.calls[1].arguments, [
      '1\tTest notice title',
    ]);
    assert.deepEqual(mockPrinter.print.mock.calls[2].arguments, [
      '\tThis is a very long text that should be wrapped at exactly eighty characters to',
    ]);
    assert.deepEqual(mockPrinter.print.mock.calls[3].arguments, [
      '\tensure proper formatting',
    ]);
    assert.ok(
      mockPrinter.print.mock.calls[4].arguments[0].includes(
        "If you don't want to see a notice anymore, use",
      ),
    );
    assert.ok(
      mockPrinter.print.mock.calls[4].arguments[0].includes(
        'ampx notices acknowledge <notice-id>',
      ),
    );
  });
});
