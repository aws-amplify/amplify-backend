/**
 * E2E deployment test for the pipeline via `ampx deploy --pipeline`.
 *
 * Verifies the full CLI deploy path works:
 *   CLI → discovers amplify/pipeline.ts → cdk deploy → pipeline stack created
 *
 * After deploy, validates the pipeline resource exists and has correct stages
 * via the CodePipeline SDK. Does NOT trigger pipeline execution (the CI
 * execution role lacks S3 write access to the pipeline's source bucket).
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import {
  PipelineTestProject,
  PipelineTestProjectCreator,
} from '../../test-project-setup/pipeline.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const TEST_TIMEOUT_MS = 10 * 60 * 1000;

const testProjectCreator = new PipelineTestProjectCreator();

void describe(
  'pipeline deployment e2e test',
  { concurrency: false, timeout: TEST_TIMEOUT_MS },
  () => {
    before(async () => {
      await createTestDirectory(rootTestDir);
    });
    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('deploys pipeline', () => {
      let testProject: PipelineTestProject;
      let pipelineIdentifier: BackendIdentifier;

      before(async () => {
        testProject = await testProjectCreator.createProject(rootTestDir);
        pipelineIdentifier = {
          namespace: testProject.pipelineStackName,
          name: 'pipeline',
          type: 'standalone',
        };

        process.stderr.write(
          `\n=== Pipeline E2E Test [${testProject.pipelineStackName}] ===\n`,
        );

        // Deploy the pipeline stack via ampx deploy --pipeline
        await testProject.deploy(pipelineIdentifier);

        // Verify pipeline outputs are populated (no execution trigger)
        await testProject.verifyPipelineCreated();
      });

      after(async () => {
        process.stderr.write(
          `\n=== Teardown [${testProject.pipelineStackName}] ===\n`,
        );
        try {
          await testProject.tearDown(pipelineIdentifier);
        } catch (e) {
          process.stderr.write(
            `⚠️ Failed to teardown pipeline. Check for orphaned resources: ${(e as Error).message}\n`,
          );
        }
      });

      void it('pipeline stack deployed successfully', () => {
        assert.ok(
          testProject.pipelineName,
          'Pipeline name should be populated from stack outputs',
        );
        process.stderr.write(
          `✅ Pipeline deployed: ${testProject.pipelineName}\n`,
        );
      });

      void it('pipeline has expected stages', async () => {
        const stages = await testProject.getPipelineStages();
        assert.ok(
          stages.length >= 2,
          `Expected at least 2 stages (Source + Build), got ${stages.length}`,
        );

        const stageNames = stages.map((s) => s.stageName);
        assert.ok(
          stageNames.some((n) => n?.includes('Source')),
          `Pipeline should have a Source stage, got: ${stageNames.join(', ')}`,
        );
        assert.ok(
          stageNames.some((n) => n?.includes('Build')),
          `Pipeline should have a Build stage, got: ${stageNames.join(', ')}`,
        );
        process.stderr.write(`✅ Pipeline stages: ${stageNames.join(', ')}\n`);
      });
    });
  },
);
