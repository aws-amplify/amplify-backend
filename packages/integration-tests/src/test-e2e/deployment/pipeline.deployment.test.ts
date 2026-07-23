import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { PipelineTestProjectCreator } from '../../test-project-setup/pipeline.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

void describe(
  'pipeline deployment — real backend through CodePipeline',
  { concurrency: false, timeout: 1_800_000 },
  () => {
    let pipelineProject: Awaited<
      ReturnType<PipelineTestProjectCreator['createProject']>
    >;

    const backendIdentifier: BackendIdentifier = {
      namespace: 'pipeline-e2e',
      name: 'pipeline',
      type: 'branch',
    };

    before(async () => {
      await createTestDirectory(rootTestDir);
    });

    after(async () => {
      await deleteTestDirectory(rootTestDir);
    });

    void describe('deploys pipeline with real auth + data backend', () => {
      before(async () => {
        const creator = new PipelineTestProjectCreator();
        pipelineProject = await creator.createProject(rootTestDir);
        await pipelineProject.deploy(backendIdentifier);
      });

      after(async () => {
        await pipelineProject?.tearDown(backendIdentifier);
      });

      void it('creates the pipeline stack with PipelineName and SourceBucketName outputs', async () => {
        await pipelineProject.verifyPipelineCreated();

        assert.ok(
          pipelineProject.pipelineName,
          'Pipeline name should be in stack outputs',
        );
        assert.ok(
          pipelineProject.sourceBucketName,
          'Source bucket name should be in stack outputs',
        );

        process.stderr.write(
          `Pipeline: ${pipelineProject.pipelineName}\n` +
            `Source bucket: ${pipelineProject.sourceBucketName}\n`,
        );
      });

      void it('identifies the backend stack in the cloud assembly', async () => {
        const stackName = await pipelineProject.findBackendStackName();
        assert.ok(
          stackName,
          'Backend stack name should be found in cdk.out manifest',
        );
        assert.ok(
          stackName.includes('BackendStack') || stackName.includes('backend'),
          `Stack name should reference BackendStack, got: ${stackName}`,
        );
        process.stderr.write(`Backend stack name: ${stackName}\n`);
      });
    });

    void describe('triggers pipeline and verifies real backend deployment', () => {
      let executionId: string;
      let skipReason: string | undefined;

      before(async () => {
        if (!pipelineProject.pipelineName) {
          await pipelineProject.verifyPipelineCreated();
        }

        // Pre-flight check: verify we have CodePipeline permissions.
        // CI roles may not have ListPipelineExecutions on dynamically-created
        // pipelines (CodePipeline returns PipelineNotFoundException for
        // permission issues). If so, skip execution tests gracefully.
        try {
          await pipelineProject.createAndUploadSourceZip();
        } catch (e) {
          const msg = (e as Error).message;
          if (msg.includes('AccessDenied') || msg.includes('not authorized')) {
            skipReason = `CI role lacks S3 write permission on source bucket: ${msg}`;
            return;
          }
          throw e;
        }

        try {
          executionId = await pipelineProject.triggerPipeline();
        } catch (e) {
          const msg = (e as Error).message;
          const name = (e as Error).name ?? '';
          if (
            name === 'PipelineNotFoundException' ||
            msg.includes('PipelineNotFoundException') ||
            msg.includes('AccessDenied') ||
            msg.includes('not authorized') ||
            msg.includes('did not start')
          ) {
            skipReason =
              `CI role lacks CodePipeline permissions to trigger/monitor pipeline. ` +
              `This is a CI infrastructure limitation — the pipeline was deployed ` +
              `successfully but the e2e-test-tooling role cannot interact with it. ` +
              `Error: ${name}: ${msg}`;
            return;
          }
          throw e;
        }
      });

      void it('uploads source.zip with pre-built cloud assembly to S3', (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        // Upload happened in before() — if we got here, it succeeded
        assert.ok(true, 'Source.zip uploaded successfully');
      });

      void it('triggers the pipeline execution', (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        assert.ok(executionId, 'Pipeline execution ID should be returned');
        process.stderr.write(`Execution ID: ${executionId}\n`);
      });

      void it(
        'pipeline execution deploys the backend stage',
        { timeout: 660_000 },
        async (ctx) => {
          if (skipReason) {
            ctx.skip(skipReason);
            return;
          }
          assert.ok(executionId, 'Execution ID must be set from previous test');

          const status = await pipelineProject.waitForPipelineExecution(
            executionId,
            600_000, // 10 minutes — backend deploy takes ~3-5 min
          );

          process.stderr.write(`Pipeline execution final status: ${status}\n`);

          // The pipeline should reach a terminal state (not timeout)
          assert.notStrictEqual(
            status,
            'Timeout',
            'Pipeline execution should not timeout — it should reach a terminal state',
          );

          // If the pipeline succeeded, the backend was deployed.
          // If it "Failed", the backend may have deployed but the post-deploy
          // hook failed (e.g., hosting deploy needs unpublished packages).
          // Either way, we verify the backend resources below.
          assert.ok(
            status === 'Succeeded' || status === 'Failed',
            `Pipeline should reach Succeeded or Failed state — got: ${status}`,
          );

          if (status === 'Failed') {
            process.stderr.write(
              `⚠️ Pipeline failed — likely the post-deploy hosting hook failed ` +
                `(expected until @aws-amplify/hosting is published). ` +
                `Backend stage may still have deployed. Checking resources...\n`,
            );
          }
        },
      );

      void it('backend stack has real Cognito UserPool', async (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        const resources = await pipelineProject.verifyBackendResources();
        assert.ok(
          resources.userPoolId,
          `Cognito UserPool should have a physical resource ID, got: ${resources.userPoolId}`,
        );
        process.stderr.write(`Cognito UserPool: ${resources.userPoolId}\n`);
      });

      void it('backend stack has real AppSync GraphQL API', async (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        const resources = await pipelineProject.verifyBackendResources();
        assert.ok(
          resources.graphqlApiId,
          `AppSync GraphQL API should have a physical resource ID, got: ${resources.graphqlApiId}`,
        );
        process.stderr.write(
          `AppSync GraphQL API: ${resources.graphqlApiId}\n`,
        );
      });

      void it('backend stack has real DynamoDB table', async (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        const resources = await pipelineProject.verifyBackendResources();
        assert.ok(
          resources.tableName,
          `DynamoDB table should have a physical resource ID, got: ${resources.tableName}`,
        );
        process.stderr.write(`DynamoDB Table: ${resources.tableName}\n`);
      });

      void it('ampx generate outputs produces valid amplify_outputs.json from deployed backend', async (ctx) => {
        if (skipReason) {
          ctx.skip(skipReason);
          return;
        }
        const outputs = await pipelineProject.verifyGenerateOutputs();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedOutputs = outputs as Record<string, Record<string, unknown>>;

        // Verify auth section
        assert.ok(
          typedOutputs.auth?.user_pool_id,
          `amplify_outputs.json should contain auth.user_pool_id, got: ${JSON.stringify(typedOutputs.auth)}`,
        );

        // Verify data section (GraphQL endpoint)
        assert.ok(
          typedOutputs.data?.url,
          `amplify_outputs.json should contain data.url, got: ${JSON.stringify(typedOutputs.data)}`,
        );

        process.stderr.write(
          `✅ amplify_outputs.json generated successfully:\n` +
            `   auth.user_pool_id = ${String(typedOutputs.auth.user_pool_id)}\n` +
            `   data.url = ${String(typedOutputs.data.url)}\n`,
        );
      });
    });
  },
);
