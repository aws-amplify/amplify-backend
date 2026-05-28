import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CodePipelineClient,
  GetPipelineCommand,
} from '@aws-sdk/client-codepipeline';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { PipelineTestProjectCreator } from '../../test-project-setup/pipeline.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

void describe('pipeline deployment', { timeout: 600_000 }, () => {
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

  void describe('deploys pipeline', () => {
    before(async () => {
      const creator = new PipelineTestProjectCreator();
      pipelineProject = await creator.createProject(rootTestDir);
      await pipelineProject.deploy(backendIdentifier);
    });

    after(async () => {
      await pipelineProject?.tearDown(backendIdentifier);
    });

    void it('creates a CodePipeline V2 with correct stages', async () => {
      const client = new CodePipelineClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });

      await pipelineProject.verifyPipelineCreated();
      const pipelineName = pipelineProject.pipelineName;
      assert.ok(pipelineName, 'Pipeline name should be found');

      const response = await client.send(
        new GetPipelineCommand({ name: pipelineName }),
      );
      assert.ok(response.pipeline, 'Pipeline should exist');

      const stageNames = response.pipeline.stages?.map((s) => s.name) ?? [];
      assert.ok(stageNames.includes('Source'), 'Should have Source stage');
      assert.ok(stageNames.includes('Build'), 'Should have Build stage');
    });
  });
});
