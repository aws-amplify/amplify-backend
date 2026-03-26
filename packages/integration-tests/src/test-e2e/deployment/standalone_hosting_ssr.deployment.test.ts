import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { StandaloneHostingSsrTestProjectCreator } from '../../test-project-setup/standalone_hosting_ssr.js';
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

const testProjectCreator = new StandaloneHostingSsrTestProjectCreator();

void describe(
  'standalone hosting SSR deployment tests',
  { concurrency: testConcurrencyLevel },
  () => {
    const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('standalone deploys hosting-ssr', () => {
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
        await testProject.tearDown(standaloneBackendIdentifier, true);
      }, { timeout: 1500000 });

      void it(
        `[${testProjectCreator.name}] deploys SSR hosting via standalone`,
        async () => {
          await testProject.deploy(standaloneBackendIdentifier);

          const stackName = BackendIdentifierConversions.toStackName(
            standaloneBackendIdentifier,
          );

          // Verify stack deployed successfully
          const describeResult = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          assert.ok(
            describeResult.Stacks && describeResult.Stacks.length > 0,
            'standalone hosting SSR stack should exist after deployment',
          );
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

          // Enumerate nested stack resources
          for (const nestedStackId of nestedStackIds) {
            const nestedResources = await cfnClient.send(
              new ListStackResourcesCommand({ StackName: nestedStackId }),
            );
            for (const r of nestedResources.StackResourceSummaries ?? []) {
              allResourceTypes.push(r.ResourceType!);
            }
          }

          // ---- SSR-specific assertions ----

          // Verify Lambda function exists (for SSR compute)
          assert.ok(
            allResourceTypes.includes('AWS::Lambda::Function'),
            'SSR hosting stack should contain a Lambda function for server-side rendering',
          );

          // Verify Lambda Function URL exists
          assert.ok(
            allResourceTypes.includes('AWS::Lambda::Url'),
            'SSR hosting stack should contain a Lambda Function URL for streaming',
          );

          // Verify S3 bucket exists (for static assets)
          assert.ok(
            allResourceTypes.includes('AWS::S3::Bucket'),
            'SSR hosting stack should contain an S3 bucket for static assets',
          );

          // Verify CloudFront distribution exists
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Distribution'),
            'SSR hosting stack should contain a CloudFront distribution',
          );

          // Verify Origin Access Control exists (OAC, NOT legacy OAI)
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::OriginAccessControl'),
            'SSR hosting stack should contain Origin Access Control (OAC)',
          );

          // Verify CloudFront Function exists (for Build ID rewriting)
          assert.ok(
            allResourceTypes.includes('AWS::CloudFront::Function'),
            'SSR hosting stack should contain a CloudFront Function for atomic deploys',
          );

          // Verify NO legacy OAI
          assert.ok(
            !allResourceTypes.includes(
              'AWS::CloudFront::CloudFrontOriginAccessIdentity',
            ),
            'SSR hosting stack should NOT contain legacy Origin Access Identity (OAI)',
          );

          // Verify NO Amplify Hosting managed resources
          assert.ok(
            !allResourceTypes.includes('AWS::Amplify::App'),
            'standalone SSR hosting stack should not use managed AWS::Amplify::App',
          );
          assert.ok(
            !allResourceTypes.includes('AWS::Amplify::Branch'),
            'standalone SSR hosting stack should not use managed AWS::Amplify::Branch',
          );

          // Verify post-deployment assertions (client config file exists)
          await testProject.assertPostDeployment(standaloneBackendIdentifier);
        },
      );
    });
  },
);
