import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { TestProjectBase } from '../../test-project-setup/test_project_base.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { testConcurrencyLevel } from '../test_concurrency.js';
import { shortUuid } from '../../short_uuid.js';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyAmplifyProject } from '../../test-project-setup/create_empty_amplify_project.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { TestProjectCreator } from '../../test-project-setup/test_project_creator.js';

class StandaloneHostingBuildTestProjectCreator implements TestProjectCreator {
  readonly name = 'standalone-hosting-build';

  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new StandaloneHostingBuildTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );

    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );

    // Copy src/ and build.js
    const sourceSrcDir = new URL(
      `${project.sourceProjectDirPath}/src`,
      import.meta.url,
    );
    const destSrcDir = path.join(projectRoot, 'src');
    await fs.cp(sourceSrcDir, destSrcDir, { recursive: true });

    const sourceBuildJs = new URL(
      `${project.sourceProjectDirPath}/build.js`,
      import.meta.url,
    );
    await fs.cp(sourceBuildJs, path.join(projectRoot, 'build.js'));

    return project;
  };
}

class StandaloneHostingBuildTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/standalone-hosting-build';
  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );
}

const testProjectCreator = new StandaloneHostingBuildTestProjectCreator();

void describe(
  'standalone hosting build pipeline deployment tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting with build pipeline', () => {
      let standaloneBackendIdentifier: BackendIdentifier;
      let testProject: TestProjectBase;

      beforeEach(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        standaloneBackendIdentifier = {
          namespace: `standalone-e2e-${shortUuid()}`,
          name: 'stack',
          type: 'standalone',
        };
      });

      afterEach(async () => {
        try {
          await testProject.tearDown(standaloneBackendIdentifier, true);
        } catch {
          console.warn('⚠️ Stack deletion may not have completed. Check for orphaned resources.');
        }
      }, { timeout: 1500000 });

      void it(
        `[${testProjectCreator.name}] deploys hosting with build command`,
        async () => {
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(describeResult.Stacks && describeResult.Stacks.length > 0);
          const stack = describeResult.Stacks![0];
          assert.ok(
            stack.StackStatus === 'CREATE_COMPLETE' ||
              stack.StackStatus === 'UPDATE_COMPLETE',
            `stack should be in a successful state, got: ${stack.StackStatus}`,
          );

          // List all resources across root and nested stacks
          const rootResources = await cfnClient.send(
            new ListStackResourcesCommand({ StackName: stackName }),
          );
          const allResourceTypes: string[] = [];
          const nestedStackIds: string[] = [];

          for (const r of rootResources.StackResourceSummaries ?? []) {
            allResourceTypes.push(r.ResourceType!);
            if (r.ResourceType === 'AWS::CloudFormation::Stack') {
              nestedStackIds.push(r.PhysicalResourceId!);
            }
          }

          for (const nestedStackId of nestedStackIds) {
            const nestedResources = await cfnClient.send(
              new ListStackResourcesCommand({ StackName: nestedStackId }),
            );
            for (const r of nestedResources.StackResourceSummaries ?? []) {
              allResourceTypes.push(r.ResourceType!);
            }
          }

          // Verify standard hosting resources
          assert.ok(
            allResourceTypes.includes('AWS::S3::Bucket'),
            'Should have S3 bucket',
          );
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Distribution'),
            'Should have CloudFront distribution',
          );
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::OriginAccessControl'),
            'Should have OAC',
          );
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Function'),
            'Should have CloudFront Function',
          );

          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        },
      );
    });
  },
);
