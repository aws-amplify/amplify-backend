import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { NoticesController } from './notices_controller.js';
import { Notice } from '@aws-amplify/cli-core';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { NamespaceResolver } from '../backend-identifier/local_namespace_resolver.js';
import {
  noticesAcknowledgementFileInstance,
  noticesMetadataFileInstance,
} from './notices_files.js';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';
import { NoticePredicatesEvaluator } from './notice_predicates_evaluator.js';

void describe('NoticesController', () => {
  // Mock dependencies
  const mockPackageManagerController =
    {} as unknown as PackageManagerController;

  const mockAcknowledgementFile = {
    read: mock.fn<(typeof noticesAcknowledgementFileInstance)['read']>(),
    write: mock.fn<(typeof noticesAcknowledgementFileInstance)['write']>(),
  };

  const mockNoticesMetadataFile = {
    read: mock.fn<(typeof noticesMetadataFileInstance)['read']>(),
    write: mock.fn<(typeof noticesMetadataFileInstance)['write']>(),
  };

  const testProjectName = 'test-project-name';
  const mockNamespaceResolver = {
    resolve: mock.fn<NamespaceResolver['resolve']>(async () => testProjectName),
  };

  const mockNoticesManifestFetcher = {
    fetchNoticesManifest:
      mock.fn<NoticesManifestFetcher['fetchNoticesManifest']>(),
  };

  const mockNoticePredicatesEvaluator = {
    evaluate: mock.fn<NoticePredicatesEvaluator['evaluate']>(),
  };

  const createController = () => {
    return new NoticesController(
      mockPackageManagerController,
      mockAcknowledgementFile as unknown as typeof noticesAcknowledgementFileInstance,
      mockNoticesMetadataFile as unknown as typeof noticesMetadataFileInstance,
      mockNamespaceResolver,
      mockNoticesManifestFetcher as unknown as NoticesManifestFetcher,
      mockNoticePredicatesEvaluator as unknown as NoticePredicatesEvaluator,
    );
  };

  beforeEach(() => {
    mockAcknowledgementFile.read.mock.resetCalls();
    mockAcknowledgementFile.write.mock.resetCalls();
    mockNoticesMetadataFile.read.mock.resetCalls();
    mockNoticesMetadataFile.write.mock.resetCalls();
    mockNamespaceResolver.resolve.mock.resetCalls();
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.resetCalls();
    mockNoticePredicatesEvaluator.evaluate.mock.resetCalls();
  });

  void it('getApplicableNotices returns filtered notices', async () => {
    // Sample notices
    const testNotices: Notice[] = [
      {
        id: '1',
        title: 'Test title 1',
        details: 'Test details 1',
        predicates: [],
      },
      {
        id: '2',
        title: 'Test title 2',
        details: 'Test details 2',
        predicates: [],
      },
    ];

    // Mock manifest fetcher to return test notices
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementation(
      async () => ({
        notices: testNotices,
      }),
    );

    // Mock predicate evaluator to return true for first notice only
    mockNoticePredicatesEvaluator.evaluate.mock.mockImplementation(
      async (notice) => notice.id === '1',
    );

    // Mock acknowledgement file to return empty array
    mockAcknowledgementFile.read.mock.mockImplementation(async () => ({
      projectAcknowledgements: [],
    }));

    // Mock printing tracker to return empty array
    mockNoticesMetadataFile.read.mock.mockImplementation(async () => ({
      printTimes: [],
      manifestCache: {
        noticesManifest: { notices: [] },
        refreshedAt: 0,
      },
    }));

    const controller = createController();
    const result = await controller.getApplicableNotices({
      includeAcknowledged: false,
      event: 'postDeployment',
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '1');
    assert.strictEqual(
      mockNoticesManifestFetcher.fetchNoticesManifest.mock.calls.length,
      1,
    );
    assert.strictEqual(
      mockNoticePredicatesEvaluator.evaluate.mock.calls.length,
      2,
    );
  });

  void it('getApplicableNotices filters out acknowledged notices', async () => {
    const testNotices: Notice[] = [
      {
        id: '1',
        title: 'Test title 1',
        details: 'Test details 1',
        predicates: [],
      },
      {
        id: '2',
        title: 'Test title 2',
        details: 'Test details 2',
        predicates: [],
      },
    ];

    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementation(
      async () => ({
        notices: testNotices,
      }),
    );

    mockNoticePredicatesEvaluator.evaluate.mock.mockImplementation(
      async () => true,
    );

    // Mock acknowledged notices
    mockAcknowledgementFile.read.mock.mockImplementation(async () => {
      return {
        projectAcknowledgements: [
          {
            projectName: testProjectName,
            noticeId: '1',
            acknowledgedAt: Date.now(),
          },
        ],
      };
    });
    mockNoticesMetadataFile.read.mock.mockImplementation(async () => {
      return {
        printTimes: [],
        manifestCache: {
          noticesManifest: { notices: [] },
          refreshedAt: 0,
        },
      };
    });

    const controller = createController();
    const result = await controller.getApplicableNotices({
      includeAcknowledged: false,
      event: 'postDeployment',
    });

    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], testNotices[1]);
  });

  void it('getApplicableNotices does not filter out acknowledged notices', async () => {
    const testNotices: Notice[] = [
      {
        id: '1',
        title: 'Test title 1',
        details: 'Test details 1',
        predicates: [],
      },
      {
        id: '2',
        title: 'Test title 2',
        details: 'Test details 2',
        predicates: [],
      },
    ];

    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementation(
      async () => ({
        notices: testNotices,
      }),
    );

    mockNoticePredicatesEvaluator.evaluate.mock.mockImplementation(
      async () => true,
    );

    // Mock acknowledged notices
    mockAcknowledgementFile.read.mock.mockImplementation(async () => {
      return {
        projectAcknowledgements: [
          {
            projectName: testProjectName,
            noticeId: '1',
            acknowledgedAt: Date.now(),
          },
        ],
      };
    });
    mockNoticesMetadataFile.read.mock.mockImplementation(async () => {
      return {
        printTimes: [],
        manifestCache: {
          noticesManifest: { notices: [] },
          refreshedAt: 0,
        },
      };
    });

    const controller = createController();
    const result = await controller.getApplicableNotices({
      includeAcknowledged: true,
      event: 'postDeployment',
    });

    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], testNotices[0]);
    assert.deepStrictEqual(result[1], testNotices[1]);
  });

  void it('getApplicableNotices handles manifest fetch errors', async () => {
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementation(
      async () => {
        throw new Error('Failed to fetch manifest');
      },
    );

    const controller = createController();
    await assert.rejects(
      async () =>
        await controller.getApplicableNotices({
          event: 'postDeployment',
        }),
      {
        message: 'Failed to fetch manifest',
      },
    );
  });

  void it('getApplicableNotices handles empty manifest', async () => {
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementation(
      async () => ({
        notices: [],
      }),
    );

    const controller = createController();
    const result = await controller.getApplicableNotices({
      includeAcknowledged: false,
      event: 'postDeployment',
    });

    assert.strictEqual(result.length, 0);
  });

  void it('acknowledge updates acknowledgement file', async () => {
    const noticeId = 'test-notice';
    mockAcknowledgementFile.read.mock.mockImplementation(async () => {
      return {
        projectAcknowledgements: [],
      };
    });
    mockAcknowledgementFile.write.mock.mockImplementation(async () => {});

    const controller = createController();
    await controller.acknowledge(noticeId);

    assert.strictEqual(mockAcknowledgementFile.write.mock.calls.length, 1);
    const writtenContent =
      mockAcknowledgementFile.write.mock.calls[0].arguments[0];
    const projectAcknowledgements = writtenContent.projectAcknowledgements;
    assert.strictEqual(projectAcknowledgements.length, 1);
    assert.strictEqual(projectAcknowledgements[0].noticeId, noticeId);
    assert.strictEqual(projectAcknowledgements[0].projectName, testProjectName);
    assert.ok(projectAcknowledgements[0].acknowledgedAt > 0);
  });

  void it('recordPrintingTimes updates printing tracker file', async () => {
    const testNotice1: Notice = {
      id: '1',
      title: 'Test title 1',
      details: 'Test details 1',
      predicates: [],
    };
    const testNotice2: Notice = {
      id: '2',
      title: 'Test title 2',
      details: 'Test details 2',
      predicates: [],
    };
    const previousShowTime = Date.now() - 60000;
    mockNoticesMetadataFile.read.mock.mockImplementation(async () => {
      return {
        printTimes: [
          {
            projectName: testProjectName,
            noticeId: testNotice1.id,
            shownAt: previousShowTime,
          },
        ],
        manifestCache: {
          noticesManifest: { notices: [] },
          refreshedAt: 0,
        },
      };
    });
    mockNoticesMetadataFile.write.mock.mockImplementation(async () => {});

    const controller = createController();
    await controller.recordPrintingTimes([testNotice1, testNotice2]);

    assert.strictEqual(mockNoticesMetadataFile.write.mock.calls.length, 1);
    const writtenTrackerContent =
      mockNoticesMetadataFile.write.mock.calls[0].arguments[0];
    const printTimes = writtenTrackerContent.printTimes;
    assert.strictEqual(printTimes.length, 2);
    assert.strictEqual(printTimes[0].noticeId, testNotice1.id);
    assert.strictEqual(printTimes[0].projectName, testProjectName);
    assert.ok(
      printTimes[0].shownAt > previousShowTime,
      'shownAt for notice 1 should be updated',
    );
    assert.strictEqual(printTimes[1].noticeId, testNotice2.id);
    assert.strictEqual(printTimes[1].projectName, testProjectName);
    assert.ok(printTimes[1].shownAt > 0, 'shownAt for notice 2 should be set');
  });
});
