import { App, CfnOutput, SecretValue, Stack } from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import path from 'node:path';

export type PipelineStage = {
  name: string;
  requireApproval?: boolean;
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
 * Defines a CI/CD pipeline (CodePipeline V2 + CodeBuild) that deploys
 * backend + frontend on every push.
 * Call from amplify/pipeline.ts.
 */
export const definePipeline = (config: PipelineConfig): void => {
  const pipelineOutDir = path.resolve(
    process.cwd(),
    '.amplify/artifacts/pipeline.out',
  );
  const app = new App({ outdir: pipelineOutDir });
  const stack = new Stack(app, config.stackName);

  const sourceOutput = new codepipeline.Artifact('SourceOutput');
  const sourceAction = new codepipelineActions.GitHubSourceAction({
    actionName: 'Checkout',
    owner: config.source.owner,
    repo: config.source.repo,
    branch: config.source.branch,
    oauthToken: SecretValue.secretsManager(config.source.tokenSecretName),
    output: sourceOutput,
    trigger: codepipelineActions.GitHubTrigger.WEBHOOK,
  });

  const installCommands = [
    'npm install --legacy-peer-deps',
    'git clone --branch feat/iac-demo --single-branch https://github.com/aws-amplify/amplify-backend.git /tmp/amplify-backend',
    'cd /tmp/amplify-backend && npm ci && npm run build',
    'cd /tmp/amplify-backend/packages/backend && npm link',
    'cd /tmp/amplify-backend/packages/cli && npm link',
    'cd $CODEBUILD_SRC_DIR && npm link @aws-amplify/backend @aws-amplify/backend-cli',
  ];

  // Self-mutation project
  const selfMutateProject = new codebuild.PipelineProject(
    stack,
    'SelfMutateProject',
    {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
            commands: installCommands,
          },
          build: {
            commands: ['npx ampx pipeline-deploy --pipeline'],
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
    },
  );

  selfMutateProject.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        'cloudformation:*',
        'iam:*',
        's3:*',
        'ssm:*',
        'sts:AssumeRole',
        'codepipeline:*',
        'codebuild:*',
      ],
      resources: ['*'],
    }),
  );

  // Build pipeline stages
  const pipelineStages: codepipeline.StageProps[] = [
    {
      stageName: 'Source',
      actions: [sourceAction],
    },
    {
      stageName: 'UpdatePipeline',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'SelfMutate',
          project: selfMutateProject,
          input: sourceOutput,
        }),
      ],
    },
  ];

  for (const stage of config.stages) {
    const capitalizedName =
      stage.name.charAt(0).toUpperCase() + stage.name.slice(1);

    const deployProject = new codebuild.PipelineProject(
      stack,
      `Deploy${capitalizedName}`,
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              'runtime-versions': { nodejs: '20' },
              commands: installCommands,
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
            AMPLIFY_STAGE: { value: stage.name },
          },
        },
      },
    );

    deployProject.addToRolePolicy(
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

    const stageActions: codepipeline.IAction[] = [];

    // Add manual approval before deploy if configured
    if (stage.requireApproval) {
      stageActions.push(
        new codepipelineActions.ManualApprovalAction({
          actionName: 'Approve',
          runOrder: 1,
        }),
      );
    }

    stageActions.push(
      new codepipelineActions.CodeBuildAction({
        actionName: 'DeployBackendAndFrontend',
        project: deployProject,
        input: sourceOutput,
        runOrder: stage.requireApproval ? 2 : 1,
      }),
    );

    pipelineStages.push({
      stageName: capitalizedName,
      actions: stageActions,
    });
  }

  new codepipeline.Pipeline(stack, 'Pipeline', {
    pipelineName: `${config.stackName}`,
    pipelineType: codepipeline.PipelineType.V2,
    stages: pipelineStages,
  });

  new CfnOutput(stack, 'PipelineName', {
    value: config.stackName,
  });

  // Register synth listener
  process.once('message', (message) => {
    if (message !== 'amplifyPipelineSynth') {
      return;
    }
    app.synth();
  });
};
