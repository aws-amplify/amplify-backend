import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
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

    void it('creates the pipeline stack with expected outputs', async () => {
      await pipelineProject.verifyPipelineCreated();
      const pipelineName = pipelineProject.pipelineName;
      assert.ok(pipelineName, 'Pipeline name should be in stack outputs');
      assert.match(
        pipelineName,
        /Pipeline/,
        'Pipeline name should contain "Pipeline"',
      );
    });
  });
});
