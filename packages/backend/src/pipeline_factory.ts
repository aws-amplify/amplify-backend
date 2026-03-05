import { App, CfnOutput, SecretValue, Stack } from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import path from 'node:path';

export type PipelineStage = {
  name: string;
};

export type PipelineConfig = {
  stackName: string;
  source: {
    provider: 'github';
    owner: string;
    repo: string;
    branch: string;
    tokenSecretName: string;
  };
  stages: PipelineStage[];
};

/**
 * Defines a CI/CD pipeline (CodePipeline + CodeBuild) that deploys
 * backend + frontend on every push.
 * Call from amplify/pipeline.ts.
 */
export const definePipeline = (config: PipelineConfig): void => {
  const frontendOutDir = path.resolve(
    process.cwd(),
    '.amplify/artifacts/pipeline.out',
  );
  const app = new App({ outdir: frontendOutDir });
  const stack = new Stack(app, config.stackName);

  const sourceOutput = new codepipeline.Artifact('SourceOutput');
  const sourceAction = new codepipelineActions.GitHubSourceAction({
    actionName: 'GitHub_Source',
    owner: config.source.owner,
    repo: config.source.repo,
    branch: config.source.branch,
    oauthToken: SecretValue.secretsManager(config.source.tokenSecretName),
    output: sourceOutput,
    trigger: codepipelineActions.GitHubTrigger.WEBHOOK,
  });

  // CodeBuild project that runs the deploy
  const buildProject = new codebuild.PipelineProject(stack, 'DeployProject', {
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        install: {
          'runtime-versions': {
            nodejs: '20',
          },
          commands: [
            'npm ci',
            'git clone --branch feat/iac-demo --single-branch https://github.com/aws-amplify/amplify-backend.git /tmp/amplify-backend',
            'cd /tmp/amplify-backend && npm ci && npm run build',
            'cd /tmp/amplify-backend/packages/backend && npm link',
            'cd /tmp/amplify-backend/packages/cli && npm link',
            'cd $CODEBUILD_SRC_DIR && npm link @aws-amplify/backend @aws-amplify/backend-cli',
          ],
        },
        build: {
          commands: ['npx ampx pipeline-deploy --infrastructure'],
        },
      },
    }),
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.MEDIUM,
      environmentVariables: {
        CI: { value: 'true' },
      },
    },
  });

  // Grant the build project broad permissions for deploying CDK stacks
  buildProject.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        'cloudformation:*',
        'iam:*',
        'lambda:*',
        'cognito-idp:*',
        'cognito-identity:*',
        'appsync:*',
        's3:*',
        'cloudfront:*',
        'ssm:*',
        'sts:AssumeRole',
      ],
      resources: ['*'],
    }),
  );

  const buildAction = new codepipelineActions.CodeBuildAction({
    actionName: 'Deploy_Infrastructure',
    project: buildProject,
    input: sourceOutput,
  });

  new codepipeline.Pipeline(stack, 'Pipeline', {
    pipelineName: `${config.stackName}-pipeline`,
    stages: [
      {
        stageName: 'Source',
        actions: [sourceAction],
      },
      {
        stageName: 'Deploy',
        actions: [buildAction],
      },
    ],
  });

  new CfnOutput(stack, 'PipelineName', {
    value: `${config.stackName}-pipeline`,
  });

  // Register synth listener
  process.once('message', (message) => {
    if (message !== 'amplifyPipelineSynth') {
      return;
    }
    app.synth();
  });
};
