import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { NoticePredicatesEvaluator } from './notice_predicates_evaluator.js';
import { Notice } from '@aws-amplify/cli-core';
import { NoticesRendererParams } from './notices_renderer.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { NamespaceResolver } from '../backend-identifier/local_namespace_resolver.js';
import { noticesMetadataFileInstance } from './notices_files.js';

type TestCase = {
  title: string;
  notice: Notice;
  opts?: NoticesRendererParams;
  mockProcess?: Partial<typeof process>;
  printTimes?: Awaited<
    ReturnType<(typeof noticesMetadataFileInstance)['read']>
  >['printTimes'];
  dependencies?: Awaited<
    ReturnType<PackageManagerController['tryGetDependencies']>
  >;
  expectedOutput: boolean;
};

void describe('NoticePredicatesEvaluator', () => {
  const mockPackageManagerController = {
    tryGetDependencies:
      mock.fn<PackageManagerController['tryGetDependencies']>(),
  };

  const testProjectName = 'test-project-name';
  const mockNamespaceResolver = {
    resolve: mock.fn<NamespaceResolver['resolve']>(async () => testProjectName),
  };

  const mockNoticesPrintingTrackerFile = {
    read: mock.fn<(typeof noticesMetadataFileInstance)['read']>(async () => ({
      printTimes: [],
      manifestCache: {
        noticesManifest: { notices: [] },
        refreshedAt: 0,
      },
    })),
  };

  const defaultMockProcess: Partial<typeof process> = {
    argv: ['node', 'ampx', 'sandbox'],
  };

  const commonNoticeProperties = {
    id: '1',
    title: 'test title',
    details: 'test details',
  };

  const testCases: Array<TestCase> = [
    {
      title: 'empty predicates happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [],
      },
      opts: {
        event: 'postCommand',
      },
      expectedOutput: true,
    },
    {
      title: 'empty predicates happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [],
      },
      opts: {
        event: 'listNoticesCommand',
      },
      expectedOutput: true,
    },
    {
      title: 'empty predicates negative case - post deployment is opt in event',
      notice: {
        ...commonNoticeProperties,
        predicates: [],
      },
      opts: {
        event: 'postDeployment',
      },
      expectedOutput: false,
    },
    {
      title: 'command happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'command negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        argv: ['node', 'ampx', 'pipeline-deploy'],
      },
      expectedOutput: false,
    },
    {
      title: 'node version happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        version: '18.4.0',
      },
      expectedOutput: true,
    },
    {
      title: 'node version negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        version: '18.2.0',
      },
      expectedOutput: false,
    },
    {
      title: 'two predicates happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        argv: ['node', 'ampx', 'sandbox'],
        version: '18.4.0',
      },
      expectedOutput: true,
    },
    {
      title: 'two predicates negative case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        argv: ['node', 'ampx', 'pipeline-deploy'],
        version: '18.4.0',
      },
      expectedOutput: false,
    },
    {
      title: 'two predicates negative case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        argv: ['node', 'ampx', 'sandbox'],
        version: '18.2.0',
      },
      expectedOutput: false,
    },
    {
      title: 'two predicates negative case 3',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'command',
            command: 'sandbox',
          },
          {
            type: 'nodeVersion',
            versionRange: '>=18.3.1',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        argv: ['node', 'ampx', 'pipeline-deploy'],
        version: '18.2.0',
      },
      expectedOutput: false,
    },
    {
      title: 'validity period happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'validity period happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
            from: Date.now() - 10000,
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'validity period happy case 3',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
            to: Date.now() + 10000,
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'validity period happy case 4',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
            from: Date.now() - 10000,
            to: Date.now() + 10000,
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'validity period negative case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
            from: Date.now() + 10000,
          },
        ],
      },
      expectedOutput: false,
    },
    {
      title: 'validity period negative case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'validityPeriod',
            to: Date.now() - 10000,
          },
        ],
      },
      expectedOutput: false,
    },
    {
      title: 'osFamily happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'osFamily',
            osFamily: 'linux',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        platform: 'linux',
      },
      expectedOutput: true,
    },
    {
      title: 'osFamily happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'osFamily',
            osFamily: 'windows',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        platform: 'win32',
      },
      expectedOutput: true,
    },
    {
      title: 'osFamily happy case 3',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'osFamily',
            osFamily: 'macos',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        platform: 'darwin',
      },
      expectedOutput: true,
    },
    {
      title: 'osFamily negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'osFamily',
            osFamily: 'macos',
          },
        ],
      },
      mockProcess: {
        ...defaultMockProcess,
        platform: 'win32',
      },
      expectedOutput: false,
    },
    {
      title: 'error message happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'errorMessage',
            errorMessage: 'expected error message',
          },
        ],
      },
      opts: {
        event: 'postCommand',
        error: new Error('some expected error message'),
      },
      expectedOutput: true,
    },
    {
      title: 'error message negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'errorMessage',
            errorMessage: 'unexpected error message',
          },
        ],
      },
      opts: {
        event: 'postCommand',
        error: new Error('some expected error message'),
      },
      expectedOutput: false,
    },
    {
      title: 'frequency command happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'command',
          },
        ],
      },
      opts: {
        event: 'postCommand',
      },
      expectedOutput: true,
    },
    {
      title: 'frequency command happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'command',
          },
        ],
      },
      opts: {
        event: 'listNoticesCommand',
      },
      expectedOutput: true,
    },
    {
      title: 'frequency negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'command',
          },
        ],
      },
      opts: {
        event: 'postDeployment',
      },
      expectedOutput: false,
    },
    {
      title: 'frequency deployment happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'deployment',
          },
        ],
      },
      opts: {
        event: 'postDeployment',
      },
      expectedOutput: true,
    },
    {
      title: 'frequency deployment happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'deployment',
          },
        ],
      },
      opts: {
        event: 'listNoticesCommand',
      },
      expectedOutput: true,
    },
    {
      title: 'frequency deployment negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'deployment',
          },
        ],
      },
      opts: {
        event: 'postCommand',
      },
      expectedOutput: false,
    },
    {
      title: 'frequency once happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'once',
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'frequency once negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'once',
          },
        ],
      },
      printTimes: [
        {
          projectName: testProjectName,
          noticeId: commonNoticeProperties.id,
          shownAt: Date.now(),
        },
      ],
      expectedOutput: false,
    },
    {
      title: 'frequency daily happy case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'daily',
          },
        ],
      },
      expectedOutput: true,
    },
    {
      title: 'frequency daily happy case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'daily',
          },
        ],
      },
      printTimes: [
        {
          projectName: testProjectName,
          noticeId: commonNoticeProperties.id,
          shownAt: Date.now() - 24 * 60 * 60 * 1000, // yesterday
        },
      ],
      expectedOutput: true,
    },
    {
      title: 'frequency daily negative case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'frequency',
            frequency: 'daily',
          },
        ],
      },
      printTimes: [
        {
          projectName: testProjectName,
          noticeId: commonNoticeProperties.id,
          shownAt: Date.now() - 1, // millisecond ago
        },
      ],
      expectedOutput: false,
    },
    {
      title: 'package version happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'packageVersion',
            packageName: 'test-dependency',
            versionRange: '>=2.0.0',
          },
        ],
      },
      dependencies: [
        {
          name: 'test-dependency',
          version: '2.1.0',
        },
      ],
      expectedOutput: true,
    },
    {
      title: 'package version negative case 1',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'packageVersion',
            packageName: 'test-dependency',
            versionRange: '>=2.0.0',
          },
        ],
      },
      dependencies: [
        {
          name: 'test-dependency',
          version: '1.1.0',
        },
      ],
      expectedOutput: false,
    },
    {
      title: 'package version negative case 2',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'packageVersion',
            packageName: 'test-dependency',
            versionRange: '>=2.0.0',
          },
        ],
      },
      dependencies: [
        {
          name: 'other-dependency',
          version: '2.4.0',
        },
      ],
      expectedOutput: false,
    },
    {
      // This predicate is ignored for now until is implemented.
      title: 'backend component happy case',
      notice: {
        ...commonNoticeProperties,
        predicates: [
          {
            type: 'backendComponent',
            backendComponent: 'function',
          },
        ],
      },
      expectedOutput: true,
    },
  ];

  testCases.forEach((testCase, index) => {
    void it(`${index}: ${testCase.title}`, async () => {
      const mockProcess = testCase.mockProcess ?? defaultMockProcess;

      if (testCase.printTimes) {
        const printTimes = testCase.printTimes;
        mockNoticesPrintingTrackerFile.read.mock.mockImplementationOnce(
          async () => ({
            printTimes,
            manifestCache: {
              noticesManifest: { notices: [] },
              refreshedAt: 0,
            },
          }),
        );
      }

      if (testCase.dependencies) {
        const dependencies = testCase.dependencies;
        mockPackageManagerController.tryGetDependencies.mock.mockImplementationOnce(
          async () => dependencies,
        );
      }

      const evaluator = new NoticePredicatesEvaluator(
        mockPackageManagerController as unknown as PackageManagerController,
        mockNamespaceResolver as unknown as NamespaceResolver,
        mockNoticesPrintingTrackerFile as unknown as typeof noticesMetadataFileInstance,
        mockProcess as unknown as typeof process,
      );

      const opts = testCase.opts ?? {
        event: 'postCommand',
      };
      const output = await evaluator.evaluate(testCase.notice, opts);
      assert.strictEqual(output, testCase.expectedOutput);
    });
  });
});
