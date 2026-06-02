import * as cdk from 'aws-cdk-lib';
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
const region =
  process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

if (!account) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT not set. Ensure AWS credentials are configured.',
  );
}

// Stack name is passed via environment variable for CI uniqueness;
// defaults to 'amplify-pipeline' for local development.
const stackName = process.env.PIPELINE_STACK_NAME || 'amplify-pipeline';

const stack = new cdk.Stack(app, stackName, {
  env: { account, region },
});

// S3 bucket for pipeline source (versioned for EventBridge trigger)
const sourceBucket = new s3.Bucket(stack, 'SourceBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  versioned: true,
});
sourceBucket.grantWrite(new iam.AccountRootPrincipal());
new cdk.CfnOutput(stack, 'SourceBucketName', {
  value: sourceBucket.bucketName,
});

const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
  source: {
    repo: 'test/pipeline-e2e',
    connectionArn:
      'arn:aws:codeconnections:' +
      region +
      ':' +
      account +
      ':connection/00000000-0000-0000-0000-000000000000',
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

  // Grant the e2e test roles permissions to start and monitor the pipeline.
  // Policy name includes stack name to avoid conflicts when parallel CI jobs
  // deploy multiple pipeline stacks attaching to the same shared roles.
  const pipelinePolicy = new iam.Policy(stack, 'PipelineTestPolicy', {
    policyName: `${stackName}-test-policy`,
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'codepipeline:StartPipelineExecution',
          'codepipeline:GetPipelineExecution',
          'codepipeline:ListPipelineExecutions',
          'codepipeline:GetPipelineState',
        ],
        resources: [
          mainPipeline.pipeline.pipelineArn,
          mainPipeline.pipeline.pipelineArn + '/*',
        ],
      }),
    ],
  });
  const e2eRole = iam.Role.fromRoleName(
    stack,
    'E2EExecutionRole',
    'e2e-execution',
  );
  e2eRole.attachInlinePolicy(pipelinePolicy);
  const e2eToolingRole = iam.Role.fromRoleName(
    stack,
    'E2EToolingRole',
    'e2e-test-tooling',
  );
  e2eToolingRole.attachInlinePolicy(pipelinePolicy);
}

app.synth();
