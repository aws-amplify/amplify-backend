import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import {
  CodePipelineClient,
  GetPipelineExecutionCommand,
  ListPipelineExecutionsCommand,
  StartPipelineExecutionCommand,
} from '@aws-sdk/client-codepipeline';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { ampxCli } from '../process-controller/process_controller.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Creates a pipeline test project that deploys a REAL application through
 * a CodePipeline — auth (Cognito), data (AppSync + DynamoDB), and hosting.
 *
 * The test:
 * 1. Deploys the pipeline stack via `ampx deploy --pipeline`
 * 2. Packages the synthesized cloud assembly as source.zip
 * 3. Triggers the pipeline via S3 upload
 * 4. Waits for the backend stage to deploy
 * 5. Verifies real AWS resources (UserPool, GraphQL API, DynamoDB table)
 * 6. Verifies `ampx generate outputs` produces valid amplify_outputs.json
 */
export class PipelineTestProjectCreator implements TestProjectCreator {
  readonly name = 'pipeline';

  /** Instantiate with default AWS clients. */
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
 * Pipeline test project — deploys a CodePipeline that builds a real backend
 * (auth + data) and verifies end-to-end resource creation.
 */
export class PipelineTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/pipeline';

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );

  readonly pipelineStackName: string;

  pipelineName = '';
  sourceBucketName = '';
  backendStackName = '';

  private readonly sourceProjectPublicDirURL: URL = new URL(
    `${this.sourceProjectDirPath}/public`,
    import.meta.url,
  );

  private readonly codePipelineClient: CodePipelineClient;
  private readonly s3Client: S3Client;

  /** Initialize pipeline test project with AWS clients and project paths. */
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
    this.pipelineStackName = `amplify-pipeline-${name.replace(/^test-project-pipeline-/, '')}`;
    this.codePipelineClient = new CodePipelineClient(e2eToolingClientConfig);
    this.s3Client = new S3Client(e2eToolingClientConfig);
  }

  /**
   * Set up the project by copying static fixtures from the source directory
   * and writing the dynamic pipeline.ts (which requires a runtime stack name).
   */
  async writeFixtureFiles(): Promise<void> {
    // Copy the amplify/ directory (backend.ts, auth/, data/, hosting.ts)
    await fs.cp(this.sourceProjectAmplifyDirURL, this.projectAmplifyDirPath, {
      recursive: true,
    });

    // Copy the public/ directory (static frontend)
    const destPublicDir = path.join(this.projectDirPath, 'public');
    await fs.cp(this.sourceProjectPublicDirURL, destPublicDir, {
      recursive: true,
    });

    // Write pipeline.ts dynamically (it contains the runtime-generated stack name)
    await fs.writeFile(
      path.join(this.projectAmplifyDirPath, 'pipeline.ts'),
      this.getPipelineFixtureContent(),
    );

    // Update package.json with build script for the post-deploy hook
    const rootPkg = JSON.parse(
      await fs.readFile(
        path.join(this.projectDirPath, 'package.json'),
        'utf-8',
      ),
    );
    rootPkg.scripts = {
      build: 'echo "Build complete — SPA uses static files"',
    };
    await fs.writeFile(
      path.join(this.projectDirPath, 'package.json'),
      JSON.stringify(rootPkg, null, 2),
    );
  }

  /**
   * Deploy the pipeline stack via `ampx deploy --pipeline`.
   * This synthesizes the full CDK app (backend + hosting stages) and deploys
   * the pipeline infrastructure (CodePipeline, S3 source bucket, etc.).
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
    process.stderr.write(`Pipeline deploy complete.\n`);
  }

  /**
   * Read pipeline stack outputs (PipelineName, SourceBucketName).
   */
  async verifyPipelineCreated(): Promise<void> {
    const stackOutputs = await this.getStackOutputs(this.pipelineStackName);
    this.pipelineName = stackOutputs.PipelineName ?? '';
    this.sourceBucketName = stackOutputs.SourceBucketName ?? '';
    process.stderr.write(`Pipeline: ${this.pipelineName}\n`);
    process.stderr.write(`Source Bucket: ${this.sourceBucketName}\n`);

    if (!this.pipelineName) {
      throw new Error(
        `Pipeline stack ${this.pipelineStackName} missing PipelineName output`,
      );
    }
    if (!this.sourceBucketName) {
      throw new Error(
        `Pipeline stack ${this.pipelineStackName} missing SourceBucketName output`,
      );
    }
  }

  /**
   * Create source.zip containing the pre-built cloud assembly and project source.
   * The pipeline's synth step uses `primaryOutputDirectory: 'cdk.out'` and the
   * deploy stage deploys the real backend stack from this assembly.
   *
   * The source.zip also includes project files needed by the post-deploy hook
   * (hosting.ts, package.json, public/).
   */
  async createAndUploadSourceZip(): Promise<void> {
    if (!this.sourceBucketName) {
      throw new Error('Call verifyPipelineCreated() first.');
    }

    const projectDir = this.projectDirPath;
    const cdkOutDir = path.join(projectDir, 'cdk.out');

    // Verify cdk.out exists from the pipeline synth
    const cdkOutExists = await fs
      .stat(cdkOutDir)
      .then(() => true)
      .catch(() => false);

    if (!cdkOutExists) {
      throw new Error(
        `cdk.out/ not found at ${cdkOutDir}. Did ampx deploy --pipeline succeed?`,
      );
    }

    // Create source.zip with cdk.out + project files using the system zip command
    const zipPath = path.join(projectDir, 'source.zip');
    execSync(
      `cd "${projectDir}" && zip -r source.zip cdk.out/ amplify/ public/ package.json`,
      { stdio: 'pipe' },
    );

    // Upload to S3
    const zipContent = await fs.readFile(zipPath);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.sourceBucketName,
        Key: 'source.zip',
        Body: zipContent,
        ContentType: 'application/zip',
      }),
    );

    process.stderr.write(
      `Uploaded source.zip (${(zipContent.length / 1024).toFixed(0)} KB) to s3://${this.sourceBucketName}/source.zip\n`,
    );
  }

  /**
   * Trigger the pipeline via StartPipelineExecution.
   * Falls back to S3 upload trigger if StartPipelineExecution is denied.
   */
  async triggerPipeline(): Promise<string> {
    process.stderr.write(`Triggering pipeline via StartPipelineExecution...\n`);

    try {
      const response = await this.codePipelineClient.send(
        new StartPipelineExecutionCommand({
          name: this.pipelineName,
        }),
      );
      const executionId = response.pipelineExecutionId!;
      process.stderr.write(`Pipeline execution started: ${executionId}\n`);
      return executionId;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('AccessDenied') || msg.includes('not authorized')) {
        process.stderr.write(
          `StartPipelineExecution denied — S3 upload should have triggered the pipeline.\n`,
        );
        // S3 upload already happened in createAndUploadSourceZip — wait for trigger
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        const latestId = await this.getLatestExecutionId();
        if (!latestId) {
          throw new Error(
            'Pipeline did not start after S3 upload. Check EventBridge rules.',
          );
        }
        return latestId;
      }
      throw e;
    }
  }

  /**
   * Wait for a pipeline execution to reach a terminal state.
   * @returns Final status (Succeeded | Failed | Stopped | Cancelled | Superseded | Timeout)
   */
  async waitForPipelineExecution(
    executionId: string,
    timeoutMs = 600_000,
  ): Promise<string> {
    const pollInterval = 30_000;
    const startTime = Date.now();

    process.stderr.write(
      `Waiting for pipeline execution ${executionId} (timeout: ${(timeoutMs / 60_000).toFixed(0)} min)...\n`,
    );

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.codePipelineClient.send(
          new GetPipelineExecutionCommand({
            pipelineName: this.pipelineName,
            pipelineExecutionId: executionId,
          }),
        );

        const status = response.pipelineExecution?.status ?? 'Unknown';
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stderr.write(`  [${elapsed}s] Execution status: ${status}\n`);

        if (
          status === 'Succeeded' ||
          status === 'Failed' ||
          status === 'Stopped' ||
          status === 'Cancelled' ||
          status === 'Superseded'
        ) {
          return status;
        }
      } catch (e) {
        process.stderr.write(
          `  Poll error (will retry): ${(e as Error).message}\n`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return 'Timeout';
  }

  /**
   * Get the most recent pipeline execution ID.
   */
  async getLatestExecutionId(): Promise<string | undefined> {
    try {
      const response = await this.codePipelineClient.send(
        new ListPipelineExecutionsCommand({
          pipelineName: this.pipelineName,
          maxResults: 1,
        }),
      );
      return response.pipelineExecutionSummaries?.[0]?.pipelineExecutionId;
    } catch (e) {
      process.stderr.write(
        `Failed to list pipeline executions: ${(e as Error).message}\n`,
      );
      return undefined;
    }
  }

  /**
   * Find the backend stack name from the synthesized cloud assembly.
   * The assembly manifest contains nested stage assemblies with the backend stack.
   */
  async findBackendStackName(): Promise<string> {
    const cdkOutDir = path.join(this.projectDirPath, 'cdk.out');

    // Read the top-level manifest to find stage assemblies
    const manifestPath = path.join(cdkOutDir, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Look for nested assemblies (stages)
    for (const [, artifact] of Object.entries(manifest.artifacts ?? {})) {
      const art = artifact as {
        type?: string;
        properties?: { directoryName?: string };
      };
      if (art.type === 'cdk:cloud-assembly') {
        // This is a nested assembly (a stage)
        const nestedDir = path.join(
          cdkOutDir,
          art.properties?.directoryName ?? '',
        );
        const nestedManifestPath = path.join(nestedDir, 'manifest.json');
        try {
          const nestedManifest = JSON.parse(
            await fs.readFile(nestedManifestPath, 'utf-8'),
          );
          // Find stack artifacts in this stage
          for (const [artifactId, nestedArtifact] of Object.entries(
            nestedManifest.artifacts ?? {},
          )) {
            const na = nestedArtifact as {
              type?: string;
              properties?: { stackName?: string };
            };
            if (
              na.type === 'aws:cloudformation:stack' &&
              artifactId.includes('BackendStack')
            ) {
              const stackName = na.properties?.stackName ?? artifactId;
              process.stderr.write(
                `Found backend stack in assembly: ${stackName}\n`,
              );
              this.backendStackName = stackName;
              return stackName;
            }
          }
        } catch {
          // Not a valid nested assembly directory — skip silently
          continue;
        }
      }
    }

    throw new Error(
      'Could not find BackendStack in cdk.out assembly manifest.',
    );
  }

  /**
   * Verify the deployed backend stack has real AWS resources.
   * Checks for Cognito UserPool, AppSync GraphQL API, and DynamoDB Table.
   */
  async verifyBackendResources(): Promise<{
    userPoolId: string;
    graphqlApiId: string;
    tableName: string;
  }> {
    if (!this.backendStackName) {
      await this.findBackendStackName();
    }

    process.stderr.write(
      `Verifying backend resources in stack: ${this.backendStackName}\n`,
    );

    const allResourceTypes = await this.getAllResourceTypes(
      this.backendStackName,
    );

    // Verify Cognito UserPool
    const userPools = allResourceTypes.filter(
      (r) => r.type === 'AWS::Cognito::UserPool',
    );
    if (userPools.length === 0) {
      throw new Error(
        `Backend stack ${this.backendStackName} has no Cognito UserPool!`,
      );
    }

    // Verify AppSync GraphQL API
    const graphqlResources = allResourceTypes.filter(
      (r) => r.type === 'AWS::AppSync::GraphQLApi',
    );
    if (graphqlResources.length === 0) {
      throw new Error(
        `Backend stack ${this.backendStackName} has no AppSync GraphQL API!`,
      );
    }

    // Verify DynamoDB Table
    const tables = allResourceTypes.filter(
      (r) => r.type === 'AWS::DynamoDB::Table',
    );
    if (tables.length === 0) {
      throw new Error(
        `Backend stack ${this.backendStackName} has no DynamoDB Table!`,
      );
    }

    process.stderr.write(
      `✅ Backend stack has ${userPools.length} UserPool(s), ${graphqlResources.length} GraphQL API(s), ${tables.length} DynamoDB Table(s)\n`,
    );

    return {
      userPoolId: userPools[0].physicalId,
      graphqlApiId: graphqlResources[0].physicalId,
      tableName: tables[0].physicalId,
    };
  }

  /**
   * Run `ampx generate outputs` locally against the deployed backend stack.
   * Verifies that amplify_outputs.json can be generated from real deployed resources.
   */
  async verifyGenerateOutputs(): Promise<Record<string, unknown>> {
    if (!this.backendStackName) {
      await this.findBackendStackName();
    }

    process.stderr.write(
      `Running ampx generate outputs --stack ${this.backendStackName}...\n`,
    );

    const env: Record<string, string> = {};
    const region = e2eToolingClientConfig.region;
    if (region) {
      env.AWS_REGION = region;
    }

    // Run ampx generate outputs against the deployed backend stack
    await ampxCli(
      [
        'generate',
        'outputs',
        '--stack',
        this.backendStackName,
        '--out-dir',
        this.projectDirPath,
      ],
      this.projectDirPath,
      { env },
    ).run();

    // Read and validate the generated outputs
    const outputsPath = path.join(this.projectDirPath, 'amplify_outputs.json');
    const outputs = JSON.parse(await fs.readFile(outputsPath, 'utf-8'));

    process.stderr.write(
      `Generated amplify_outputs.json: auth.user_pool_id=${outputs.auth?.user_pool_id}, data.url=${outputs.data?.url}\n`,
    );

    return outputs;
  }

  /**
   * Delete the pipeline stack and any application stacks deployed by the pipeline.
   */
  override async tearDown(backendIdentifier: BackendIdentifier): Promise<void> {
    void backendIdentifier;

    // Delete the backend stack first (deployed by the pipeline)
    if (this.backendStackName) {
      try {
        process.stderr.write(
          `Deleting backend stack: ${this.backendStackName}\n`,
        );
        await this.cfnClient.send(
          new DeleteStackCommand({ StackName: this.backendStackName }),
        );
      } catch (e) {
        process.stderr.write(
          `⚠️ Failed to delete backend stack: ${(e as Error).message}\n`,
        );
      }
    }

    // Delete the pipeline stack
    try {
      process.stderr.write(
        `Deleting pipeline stack: ${this.pipelineStackName}\n`,
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

  /** No-op — assertions are performed directly in the test file. */
  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    void backendId;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /** Read CloudFormation stack outputs into a key-value map. */
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

  /** List all resources (including from nested stacks) with type and physical ID. */
  private async getAllResourceTypes(
    stackName: string,
  ): Promise<Array<{ type: string; physicalId: string }>> {
    const resources: Array<{ type: string; physicalId: string }> = [];
    const nestedStackIds: string[] = [];

    const rootResources = await this.cfnClient.send(
      new ListStackResourcesCommand({ StackName: stackName }),
    );

    for (const r of rootResources.StackResourceSummaries ?? []) {
      resources.push({
        type: r.ResourceType!,
        physicalId: r.PhysicalResourceId ?? '',
      });
      if (r.ResourceType === 'AWS::CloudFormation::Stack') {
        nestedStackIds.push(r.PhysicalResourceId!);
      }
    }

    // Traverse into nested stacks
    for (const nestedId of nestedStackIds) {
      const nested = await this.cfnClient.send(
        new ListStackResourcesCommand({ StackName: nestedId }),
      );
      for (const r of nested.StackResourceSummaries ?? []) {
        resources.push({
          type: r.ResourceType!,
          physicalId: r.PhysicalResourceId ?? '',
        });
      }
    }

    return resources;
  }

  // ─── Fixture Content ─────────────────────────────────────────────────────

  private getPipelineFixtureContent(): string {
    return `import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { AmplifyPipelineConstruct } from '@aws-amplify/hosting/pipeline';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AMPLIFY_PIPELINE_SCOPE_KEY = '__AMPLIFY_PIPELINE_SCOPE__';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

if (!account) {
  throw new Error('CDK_DEFAULT_ACCOUNT not set. Ensure AWS credentials are configured.');
}

const stack = new cdk.Stack(app, '${this.pipelineStackName}', {
  env: { account, region },
});

// S3 bucket for pipeline source (versioned for EventBridge trigger)
const sourceBucket = new s3.Bucket(stack, 'SourceBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  versioned: true,
});
sourceBucket.grantWrite(new iam.AccountRootPrincipal());
new cdk.CfnOutput(stack, 'SourceBucketName', { value: sourceBucket.bucketName });

const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
  source: {
    repo: 'test/pipeline-e2e',
    connectionArn: 'arn:aws:codeconnections:' + region + ':' + account + ':connection/00000000-0000-0000-0000-000000000000',
  },
  synth: {
    commands: ['echo "Using pre-built cloud assembly"'],
    primaryOutputDirectory: 'cdk.out',
  },
  selfMutation: false,
  branches: [
    {
      branch: 'main',
      stages: [{ name: 'beta' }],
    },
  ],
  stageFactory: (scope) => {
    // Set the pipeline scope so defineBackend() attaches to this stage
    (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY] = scope;
    try {
      // Import backend.ts — this calls defineBackend() which creates
      // real Cognito, AppSync, and DynamoDB resources in this stage
      const backendFile = path.resolve(__dirname, 'backend');
      delete require.cache[require.resolve(backendFile)];
      require(backendFile);
    } finally {
      delete (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY];
    }
  },
  _sourceOverride: CodePipelineSource.s3(sourceBucket, 'source.zip'),
});

// Build and output the pipeline name
const codePipelines = pipeline.codePipelines;
const mainPipeline = codePipelines.get('main');
if (mainPipeline) {
  mainPipeline.buildPipeline();
  new cdk.CfnOutput(stack, 'PipelineName', {
    value: mainPipeline.pipeline.pipelineName,
  });

  // Grant the e2e test roles permissions to start and monitor the pipeline
  const pipelinePolicy = new iam.Policy(stack, 'PipelineTestPolicy', {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'codepipeline:StartPipelineExecution',
          'codepipeline:GetPipelineExecution',
          'codepipeline:ListPipelineExecutions',
          'codepipeline:GetPipelineState',
        ],
        resources: [mainPipeline.pipeline.pipelineArn, mainPipeline.pipeline.pipelineArn + '/*'],
      }),
    ],
  });
  const e2eRole = iam.Role.fromRoleName(stack, 'E2EExecutionRole', 'e2e-execution');
  e2eRole.attachInlinePolicy(pipelinePolicy);
  const e2eToolingRole = iam.Role.fromRoleName(stack, 'E2EToolingRole', 'e2e-test-tooling');
  e2eToolingRole.attachInlinePolicy(pipelinePolicy);
}

app.synth();
`;
  }
}
