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
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('NoticesController', () => {
  // Mock dependencies
  const mockPackageManagerController = {
    getCommand: mock.fn<PackageManagerController['getCommand']>((args) =>
      args.join(' '),
    ),
  } as unknown as PackageManagerController;

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
      event: 'postCommand',
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
      event: 'postCommand',
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
      event: 'postCommand',
    });

    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], testNotices[0]);
    assert.deepStrictEqual(result[1], testNotices[1]);
  });

  void it('getApplicableNotices filters by frequency', async () => {
    const testNotices: Notice[] = [
      {
        id: '1',
        title: 'Test title 1',
        details: 'Test details 1',
        predicates: [],
        // default frequency is command
      },
      {
        id: '2',
        title: 'Test title 2',
        details: 'Test details 2',
        predicates: [],
        frequency: 'command',
      },
      {
        id: '3',
        title: 'Test title 3',
        details: 'Test details 3',
        predicates: [],
        frequency: 'deployment',
      },
      {
        id: '4',
        title: 'Test title 4 - not shown yet',
        details: 'Test details 4',
        predicates: [],
        frequency: 'once',
      },
      {
        id: '5',
        title: 'Test title 5 - already shown',
        details: 'Test details 5',
        predicates: [],
        frequency: 'once',
      },
      {
        id: '6',
        title: 'Test title 6 - not shown yet',
        details: 'Test details 6',
        predicates: [],
        frequency: 'daily',
      },
      {
        id: '7',
        title: 'Test title 7 - already shown today',
        details: 'Test details 7',
        predicates: [],
        frequency: 'daily',
      },
      {
        id: '8',
        title: 'Test title 7 - already shown yesterday',
        details: 'Test details 7',
        predicates: [],
        frequency: 'daily',
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
        projectAcknowledgements: [],
      };
    });
    mockNoticesMetadataFile.read.mock.mockImplementation(async () => {
      return {
        printTimes: [
          {
            noticeId: '5',
            projectName: testProjectName,
            shownAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // two days ago
          },
          {
            noticeId: '7',
            projectName: testProjectName,
            shownAt: Date.now() - 1, // today
          },
          {
            noticeId: '8',
            projectName: testProjectName,
            shownAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // more than one day ago
          },
        ],
        manifestCache: {
          noticesManifest: { notices: [] },
          refreshedAt: 0,
        },
      };
    });

    const controller = createController();

    const listResult = await controller.getApplicableNotices({
      event: 'listNoticesCommand',
    });
    // list command shows all
    assert.strictEqual(listResult.length, 8);
    const listResultIds = listResult.map((item) => item.id);
    assert.deepStrictEqual(listResultIds, [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);

    const deploymentResult = await controller.getApplicableNotices({
      event: 'postDeployment',
    });
    // post deployment shows only deployment notices
    assert.strictEqual(deploymentResult.length, 1);
    const deploymentResultIds = deploymentResult.map((item) => item.id);
    assert.deepStrictEqual(deploymentResultIds, ['3']);

    const commandResult = await controller.getApplicableNotices({
      event: 'postCommand',
    });
    assert.strictEqual(commandResult.length, 6);
    const commandResultIds = commandResult.map((item) => item.id);
    assert.deepStrictEqual(commandResultIds, ['1', '2', '3', '4', '6', '8']);
  });

  void it('getApplicableNotices filters by validity period', async () => {
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
        validTo: Date.now() - 10000,
      },
      {
        id: '3',
        title: 'Test title 3',
        details: 'Test details 3',
        predicates: [],
        validTo: Date.now() - 10000,
        validFrom: Date.now() - 20000,
      },
      {
        id: '4',
        title: 'Test title 4',
        details: 'Test details 4',
        predicates: [],
        frequency: 'once',
        validTo: Date.now() + 20000,
        validFrom: Date.now() + 10000,
      },
      {
        id: '5',
        title: 'Test title 5',
        details: 'Test details 5',
        predicates: [],
        validTo: Date.now() + 10000,
        validFrom: Date.now() - 10000,
      },
      {
        id: '6',
        title: 'Test title 6',
        details: 'Test details 6',
        predicates: [],
        validFrom: Date.now() + 10000,
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
        projectAcknowledgements: [],
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

    const listResult = await controller.getApplicableNotices({
      event: 'listNoticesCommand',
    });
    // only two notices are in validity period now.
    assert.strictEqual(listResult.length, 2);
    const listResultIds = listResult.map((item) => item.id);
    assert.deepStrictEqual(listResultIds, ['1', '5']);
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
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementationOnce(
      async () => ({
        notices: [
          {
            id: noticeId,
            title: 'test title',
            details: 'test details',
            predicates: [],
          },
        ],
      }),
    );

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

  void it('acknowledge updates existing acknowledgement', async () => {
    const noticeId = 'test-notice';
    const existingAcknowledgement = {
      projectName: testProjectName,
      noticeId,
      acknowledgedAt: Date.now() - 6000,
    };
    mockAcknowledgementFile.read.mock.mockImplementation(async () => {
      return {
        projectAcknowledgements: [{ ...existingAcknowledgement }],
      };
    });
    mockAcknowledgementFile.write.mock.mockImplementation(async () => {});
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementationOnce(
      async () => ({
        notices: [
          {
            id: noticeId,
            title: 'test title',
            details: 'test details',
            predicates: [],
          },
        ],
      }),
    );

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
    assert.ok(
      projectAcknowledgements[0].acknowledgedAt !==
        existingAcknowledgement.acknowledgedAt,
    );
  });

  void it('throws when notice does not exist', async () => {
    const noticeId = 'non-existent';
    mockAcknowledgementFile.read.mock.mockImplementation(async () => {
      return {
        projectAcknowledgements: [],
      };
    });
    mockAcknowledgementFile.write.mock.mockImplementation(async () => {});
    mockNoticesManifestFetcher.fetchNoticesManifest.mock.mockImplementationOnce(
      async () => ({
        notices: [
          {
            id: '1',
            title: 'test title',
            details: 'test details',
            predicates: [],
          },
        ],
      }),
    );

    const controller = createController();
    await assert.rejects(
      () => controller.acknowledge(noticeId),
      (error: AmplifyUserError) => {
        assert.strictEqual(error.name, 'NoticeNotFoundError');
        assert.ok(
          error.resolution?.includes(
            'Ensure that notice being acknowledged exists.',
          ),
        );
        assert.ok(error.resolution?.includes('ampx notices list'));
        return true;
      },
    );
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
