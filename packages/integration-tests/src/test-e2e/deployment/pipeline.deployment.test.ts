import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CodePipelineClient,
  GetPipelineCommand,
} from '@aws-sdk/client-codepipeline';
import {
  createTestDirectory,
  deleteTestDirectory,
} from '../setup_test_directory.js';
import { PipelineTestProjectCreator } from '../../test-project-setup/pipeline.js';

void describe('pipeline deployment', { timeout: 600_000 }, () => {
  let rootTestDir: string;
  let pipelineProject: Awaited<
    ReturnType<PipelineTestProjectCreator['create']>
  >;

  before(async () => {
    rootTestDir = await createTestDirectory('pipeline-e2e');
  });

  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  void describe('deploys pipeline', () => {
    before(async () => {
      const creator = new PipelineTestProjectCreator();
      pipelineProject = await creator.create(rootTestDir);
      await pipelineProject.deploy();
    });

    after(async () => {
      await pipelineProject?.teardown();
    });

    void it('creates a CodePipeline V2 with correct stages', async () => {
      const client = new CodePipelineClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
      const pipelines = await pipelineProject.getPipelineName();
      assert.ok(pipelines, 'Pipeline name should be found');

      const response = await client.send(
        new GetPipelineCommand({ name: pipelines }),
      );
      assert.ok(response.pipeline, 'Pipeline should exist');

      const stageNames = response.pipeline.stages?.map((s) => s.name) ?? [];
      assert.ok(stageNames.includes('Source'), 'Should have Source stage');
      assert.ok(stageNames.includes('Build'), 'Should have Build stage');
    });
  });
});
