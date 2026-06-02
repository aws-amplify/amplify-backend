import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { PipelineTestProjectCreator } from '../../test-project-setup/pipeline.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from '../../e2e_tooling_client_config.js';

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

    void it('deploys CodeBuild projects for the pipeline stages', async () => {
      const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
      const stackName = pipelineProject.pipelineStackName;

      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: stackName }),
      );

      const codebuildProjects = (response.StackResources ?? []).filter(
        (r) => r.ResourceType === 'AWS::CodeBuild::Project',
      );

      // Pipeline should have at least one CodeBuild project (synth step)
      assert.ok(
        codebuildProjects.length >= 1,
        `Expected at least 1 CodeBuild project in pipeline stack, got ${codebuildProjects.length}`,
      );
    });

    // NOTE: Full pipeline execution test (trigger via S3, wait for hosting deploy)
    // is skipped because CI roles lack s3:PutObject on the pipeline's source bucket.
    // The hosting deploy step is verified at the CDK template level in
    // packages/hosting/src/pipeline/pipeline_factory.test.ts instead.
    void it('verifies source bucket was created for S3 trigger', async () => {
      const cfnClient = new CloudFormationClient(e2eToolingClientConfig);
      const stackName = pipelineProject.pipelineStackName;

      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: stackName }),
      );

      const s3Buckets = (response.StackResources ?? []).filter(
        (r) => r.ResourceType === 'AWS::S3::Bucket',
      );

      assert.ok(
        s3Buckets.length >= 1,
        `Expected at least 1 S3 bucket (source) in pipeline stack, got ${s3Buckets.length}`,
      );
    });
  });
});
