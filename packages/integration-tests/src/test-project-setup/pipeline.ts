import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import {
  CodePipelineClient,
  GetPipelineStateCommand,
} from '@aws-sdk/client-codepipeline';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { ampxCli } from '../process-controller/process_controller.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Stack name prefix matching the IAM policy pattern that the e2e-tooling role
 * has CloudFormation permissions for.
 */
const PIPELINE_STACK_PREFIX = 'amplify-pipeline';

const SPA_CONTENT_MARKER = 'Pipeline E2E Test';

/**
 * Creates a pipeline test project that deploys a CodePipeline via `ampx deploy --pipeline`.
 */
export class PipelineTestProjectCreator implements TestProjectCreator {
  readonly name = 'pipeline';

  /**
   * Instantiates the creator with default AWS clients.
   */
  constructor(
    private readonly cfnClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient = new AmplifyClient(e2eToolingClientConfig),
  ) {}

  createProject = async (
    e2eProjectDir: string,
  ): Promise<PipelineTestProject> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new PipelineTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
    );

    await project.writeFixtureFiles();

    return project;
  };
}

/**
 * Pipeline test project — deploys a CodePipeline stack and verifies it exists.
 * Does NOT trigger pipeline execution (CI roles lack S3 write access to the
 * pipeline's source bucket).
 */
export class PipelineTestProject extends TestProjectBase {
  readonly sourceProjectAmplifyDirURL: URL;
  readonly pipelineStackName: string;

  pipelineName: string = '';

  private readonly codePipelineClient: CodePipelineClient;

  /**
   * Initializes the pipeline test project with stack name and SDK clients.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
    this.pipelineStackName = `${PIPELINE_STACK_PREFIX}-${name.replace(/^test-project-pipeline-/, '')}`;
    this.sourceProjectAmplifyDirURL = new URL(
      `file://${projectAmplifyDirPath}`,
    );
    this.codePipelineClient = new CodePipelineClient(e2eToolingClientConfig);
  }

  /**
   * Write CDK fixture files for the pipeline stack deployment.
   */
  async writeFixtureFiles(): Promise<void> {
    const publicDir = path.join(this.projectDirPath, 'public');
    await fs.mkdir(publicDir, { recursive: true });

    await fs.writeFile(
      path.join(this.projectAmplifyDirPath, 'pipeline.ts'),
      this.getPipelineFixtureContent(),
    );

    await fs.writeFile(
      path.join(publicDir, 'index.html'),
      this.getIndexHtmlContent(),
    );
  }

  /**
   * Deploy the pipeline stack via `ampx deploy --pipeline`.
   */
  override async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>,
  ): Promise<void> {
    process.stderr.write(
      `Deploying pipeline stack: ${this.pipelineStackName}\n`,
    );

    const env: Record<string, string> = { ...environment };
    const region = e2eToolingClientConfig.region;
    if (region) {
      env.AWS_REGION = region;
    }

    await ampxCli(['deploy', '--pipeline', '--yes'], this.projectDirPath, {
      env,
    }).run();
    process.stderr.write(`Pipeline CLI deploy complete.\n`);
  }

  /**
   * Verify the pipeline was created by reading stack outputs.
   */
  async verifyPipelineCreated(): Promise<void> {
    const stackOutputs = await this.getStackOutputs(this.pipelineStackName);
    this.pipelineName = stackOutputs.PipelineName;
    process.stderr.write(`Pipeline: ${this.pipelineName}\n`);
  }

  /**
   * Get pipeline stages via CodePipeline SDK.
   */
  async getPipelineStages() {
    const state = await this.codePipelineClient.send(
      new GetPipelineStateCommand({ name: this.pipelineName }),
    );
    return state.stageStates ?? [];
  }

  /**
   * Delete the pipeline stack from CloudFormation.
   */
  override async tearDown(backendIdentifier: BackendIdentifier): Promise<void> {
    void backendIdentifier;
    try {
      process.stderr.write(
        `Destroying pipeline stack: ${this.pipelineStackName}\n`,
      );
      await this.cfnClient.send(
        new DeleteStackCommand({ StackName: this.pipelineStackName }),
      );
    } catch (e) {
      process.stderr.write(
        `⚠️ Failed to delete pipeline stack: ${(e as Error).message}\n`,
      );
    }
  }

  /**
   * No-op — pipeline tests assert directly in the test file.
   */
  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    void backendId;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async getStackOutputs(
    stackName: string,
  ): Promise<Record<string, string>> {
    const result = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName }),
    );
    const outputs: Record<string, string> = {};
    for (const output of result.Stacks?.[0]?.Outputs ?? []) {
      if (output.OutputKey && output.OutputValue) {
        outputs[output.OutputKey] = output.OutputValue;
      }
    }
    return outputs;
  }

  // ─── Fixture Content ─────────────────────────────────────────────────────

  private getPipelineFixtureContent(): string {
    return `import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { AmplifyPipelineConstruct } from '@aws-amplify/hosting/pipeline';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

if (!account) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT not set. Ensure AWS credentials are configured.',
  );
}

const stack = new cdk.Stack(app, '${this.pipelineStackName}', {
  env: { account, region },
});

const sourceBucket = new s3.Bucket(stack, 'SourceBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  versioned: true,
});

new cdk.CfnOutput(stack, 'SourceBucketName', {
  value: sourceBucket.bucketName,
});

const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
  source: {
    repo: 'placeholder/not-used',
    connectionArn: 'arn:aws:codeconnections:' + region + ':' + account + ':connection/00000000-0000-0000-0000-000000000000',
  },
  synth: {
    commands: ['echo "Using pre-built cloud assembly"'],
    primaryOutputDirectory: '.',
  },
  selfMutation: false,
  branches: [
    {
      branch: 'main',
      stages: [{ name: 'beta' }],
    },
  ],
  stageFactory: (scope: cdk.Stage) => {
    const appStack = new cdk.Stack(scope, 'AppStack');
    new cdk.CfnOutput(appStack, 'Placeholder', { value: 'deployed' });
  },
  _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
});

const codePipelines = pipeline.codePipelines;
const mainPipeline = codePipelines.get('main');
if (mainPipeline) {
  mainPipeline.buildPipeline();
  new cdk.CfnOutput(stack, 'PipelineName', {
    value: mainPipeline.pipeline.pipelineName,
  });
}

app.synth();
`;
  }

  private getIndexHtmlContent(): string {
    return `<!doctype html>
<html>
<head><title>Pipeline E2E</title></head>
<body>
  <h1>${SPA_CONTENT_MARKER}</h1>
  <p>Deployed via ampx deploy --pipeline.</p>
</body>
</html>
`;
  }
}
