import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { NoticesRenderer } from './notices_renderer.js';
import { LogLevel, Notice, Printer } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { NoticesController } from './notices_controller.js';
import { NoticesPrinter } from './notices_printer.js';
import { UsageDataCollector } from '@aws-amplify/platform-core';

void describe('NoticesRenderer', () => {
  // Setup common mocks
  const mockPrinterPrintNewLine = mock.fn<Printer['printNewLine']>();
  const mockPrinterLog = mock.fn<Printer['log']>();
  const mockPrinter = {
    printNewLine: mockPrinterPrintNewLine,
    log: mockPrinterLog,
  } as unknown as Printer;

  const mockProcess = {
    argv: ['node', 'script.js', 'someCommand'],
  } as unknown as typeof process;

  const mockPackageManagerController =
    {} as unknown as PackageManagerController;

  const mockUsageDataCollectorCollectMetric =
    mock.fn<UsageDataCollector['collectMetric']>();
  const mockUsageDataCollectorCollectDimension =
    mock.fn<UsageDataCollector['collectDimension']>();
  const mockUsageDataCollector = {
    collectMetric: mockUsageDataCollectorCollectMetric,
    collectDimension: mockUsageDataCollectorCollectDimension,
  } as unknown as UsageDataCollector;

  const mockNoticesControllerGetApplicableNotices =
    mock.fn<NoticesController['getApplicableNotices']>();
  const mockNoticesControllerRecordPrintingTimes =
    mock.fn<NoticesController['recordPrintingTimes']>();
  const mockNoticesController = {
    getApplicableNotices: mockNoticesControllerGetApplicableNotices,
    recordPrintingTimes: mockNoticesControllerRecordPrintingTimes,
  } as unknown as NoticesController;

  const mockNoticesPrinterPrint = mock.fn<NoticesPrinter['print']>();
  const mockNoticesPrinter = {
    print: mockNoticesPrinterPrint,
  } as unknown as NoticesPrinter;

  // Reset mocks before each test
  beforeEach(() => {
    mockPrinterPrintNewLine.mock.resetCalls();
    mockPrinterLog.mock.resetCalls();
    mockNoticesControllerGetApplicableNotices.mock.resetCalls();
    mockNoticesControllerRecordPrintingTimes.mock.resetCalls();
    mockNoticesPrinterPrint.mock.resetCalls();
    mockUsageDataCollectorCollectMetric.mock.resetCalls();
    mockUsageDataCollectorCollectDimension.mock.resetCalls();
  });

  void it('should skip notices for notices command', async () => {
    const renderer = new NoticesRenderer(
      mockPackageManagerController,
      mockUsageDataCollector,
      mockNoticesController,
      mockNoticesPrinter,
      mockPrinter,
      {
        ...mockProcess,
        argv: ['node', 'script.js', 'notices'],
      } as unknown as typeof process,
    );

    await renderer.tryFindAndPrintApplicableNotices({ event: 'postCommand' });
    assert.equal(
      mockNoticesControllerGetApplicableNotices.mock.calls.length,
      0,
    );
    assert.equal(mockNoticesPrinterPrint.mock.calls.length, 0);
    assert.equal(mockUsageDataCollectorCollectMetric.mock.calls.length, 0);
    assert.equal(mockUsageDataCollectorCollectDimension.mock.calls.length, 0);
  });

  void it('should fetch and print notices for non-notices commands', async () => {
    const mockNotices: Array<Notice> = [
      {
        id: '1',
        title: 'Test notice title',
        details: 'Test notice details',
        predicates: [],
      },
    ];
    mockNoticesControllerGetApplicableNotices.mock.mockImplementation(
      async () => mockNotices,
    );

    const renderer = new NoticesRenderer(
      mockPackageManagerController as PackageManagerController,
      mockUsageDataCollector,
      mockNoticesController,
      mockNoticesPrinter,
      mockPrinter,
      mockProcess,
    );

    await renderer.tryFindAndPrintApplicableNotices({ event: 'postCommand' });

    // Verify getApplicableNotices was called
    assert.equal(
      mockNoticesControllerGetApplicableNotices.mock.calls.length,
      1,
    );

    // Verify print was called with the notices
    assert.equal(mockNoticesPrinterPrint.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockNoticesPrinterPrint.mock.calls[0].arguments[0],
      mockNotices,
    );

    assert.equal(mockUsageDataCollectorCollectMetric.mock.calls.length, 1);
    assert.equal(mockUsageDataCollectorCollectDimension.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockUsageDataCollectorCollectMetric.mock.calls[0].arguments,
      ['noticesRendered', 1],
    );
    assert.deepStrictEqual(
      mockUsageDataCollectorCollectDimension.mock.calls[0].arguments,
      ['noticesRenderingStatus', 'SUCCESS'],
    );
  });

  void it('should handle empty notices array', async () => {
    mockNoticesControllerGetApplicableNotices.mock.mockImplementation(
      async () => [],
    );

    const renderer = new NoticesRenderer(
      mockPackageManagerController,
      mockUsageDataCollector,
      mockNoticesController,
      mockNoticesPrinter,
      mockPrinter,
      mockProcess,
    );

    await renderer.tryFindAndPrintApplicableNotices({ event: 'postCommand' });

    // Verify getApplicableNotices was called
    assert.equal(
      mockNoticesControllerGetApplicableNotices.mock.calls.length,
      1,
    );

    // Verify print was not called when there are no notices
    assert.equal(mockNoticesPrinterPrint.mock.calls.length, 0);

    assert.equal(mockUsageDataCollectorCollectMetric.mock.calls.length, 1);
    assert.equal(mockUsageDataCollectorCollectDimension.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockUsageDataCollectorCollectMetric.mock.calls[0].arguments,
      ['noticesRendered', 0],
    );
    assert.deepStrictEqual(
      mockUsageDataCollectorCollectDimension.mock.calls[0].arguments,
      ['noticesRenderingStatus', 'SUCCESS'],
    );
  });

  void it('should record printing times after successful notice display', async () => {
    const mockNotices: Array<Notice> = [
      {
        id: '1',
        title: 'Test notice title',
        details: 'Test notice details',
        predicates: [],
      },
    ];
    mockNoticesControllerGetApplicableNotices.mock.mockImplementation(
      async () => mockNotices,
    );

    const renderer = new NoticesRenderer(
      mockPackageManagerController,
      mockUsageDataCollector,
      mockNoticesController,
      mockNoticesPrinter,
      mockPrinter,
      mockProcess,
    );

    await renderer.tryFindAndPrintApplicableNotices({ event: 'postCommand' });

    // Verify recordPrintingTimes was called
    assert.equal(mockNoticesControllerRecordPrintingTimes.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockNoticesControllerRecordPrintingTimes.mock.calls[0].arguments[0],
      mockNotices,
    );
  });

  void it('should handle errors gracefully', async () => {
    mockNoticesControllerGetApplicableNotices.mock.mockImplementation(
      async () => {
        throw new Error('Test error');
      },
    );

    const renderer = new NoticesRenderer(
      mockPackageManagerController,
      mockUsageDataCollector,
      mockNoticesController,
      mockNoticesPrinter,
      mockPrinter,
      mockProcess,
    );

    await renderer.tryFindAndPrintApplicableNotices({ event: 'postCommand' });

    // Verify error was handled and didn't crash the application
    assert.equal(mockNoticesPrinterPrint.mock.calls.length, 0);
    assert.equal(mockNoticesControllerRecordPrintingTimes.mock.calls.length, 0);
    assert.equal(mockPrinterLog.mock.calls.length, 2);
    assert.deepStrictEqual(
      mockPrinterLog.mock.calls[0].arguments[0],
      'Unable to render notices on event=postCommand',
    );
    assert.deepStrictEqual(
      mockPrinterLog.mock.calls[0].arguments[1],
      LogLevel.DEBUG,
    );
    assert.deepStrictEqual(
      mockPrinterLog.mock.calls[1].arguments[0],
      'Test error',
    );
    assert.deepStrictEqual(
      mockPrinterLog.mock.calls[1].arguments[1],
      LogLevel.DEBUG,
    );

    assert.equal(mockUsageDataCollectorCollectMetric.mock.calls.length, 0);
    assert.equal(mockUsageDataCollectorCollectDimension.mock.calls.length, 1);
    assert.deepStrictEqual(
      mockUsageDataCollectorCollectDimension.mock.calls[0].arguments,
      ['noticesRenderingStatus', 'FAILURE'],
    );
  });
});
