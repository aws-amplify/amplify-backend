/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/restrict-template-expressions */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Duration, Stack, Stage } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { AmplifyPipelineConstruct } from './pipeline_construct.js';
import { getStageConfig, withPipelineScope } from './pipeline_factory.js';
import type { PipelineProps } from './types.js';

const VALID_CONNECTION_ARN =
  'arn:aws:codeconnections:us-east-1:123456789012:connection/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const defaultPipelineProps = (
  overrides?: Partial<PipelineProps>,
): PipelineProps => {
  return {
    source: {
      repo: 'my-org/my-app',
      connectionArn: VALID_CONNECTION_ARN,
    },
    branches: [
      {
        branch: 'main',
        stages: [{ name: 'beta' }, { name: 'prod' }],
      },
    ],
    stageFactory: (scope) => {
      new Stack(scope, 'AppStack');
    },
    ...overrides,
  };
};

void describe('AmplifyPipelineConstruct', () => {
  void describe('basic pipeline creation', () => {
    void it('creates a CodePipeline V2 resource', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      new AmplifyPipelineConstruct(stack, 'Pipeline', defaultPipelineProps());

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        PipelineType: 'V2',
      });
    });

    void it('creates source with CodeConnections provider', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      new AmplifyPipelineConstruct(stack, 'Pipeline', defaultPipelineProps());

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Category: 'Source',
                  Provider: 'CodeStarSourceConnection',
                }),
              }),
            ]),
          }),
        ]),
      });
    });

    void it('creates deploy stages for each stage config', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      new AmplifyPipelineConstruct(stack, 'Pipeline', defaultPipelineProps());

      const template = Template.fromStack(stack);
      const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
      const pipelineKey = Object.keys(pipelines)[0];
      const stages = (pipelines[pipelineKey] as any).Properties.Stages as any[];

      const stageNames = stages.map((s: any) => s.Name);
      assert.ok(
        stageNames.some((n: string) => n.includes('beta')),
        `Expected beta stage, got: ${stageNames}`,
      );
      assert.ok(
        stageNames.some((n: string) => n.includes('prod')),
        `Expected prod stage, got: ${stageNames}`,
      );
    });

    void it('uses default synth commands when none specified', () => {
      const app = new App();
      const stack = new Stack(app, 'DefaultCommandsStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          synth: undefined,
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Source: Match.objectLike({
          BuildSpec: Match.serializedJson(
            Match.objectLike({
              phases: Match.objectLike({
                build: Match.objectLike({
                  commands: Match.arrayWith(['npm ci', 'npx cdk synth']),
                }),
              }),
            }),
          ),
        }),
      });
    });

    void it('uses custom synth commands when provided', () => {
      const app = new App();
      const stack = new Stack(app, 'CustomCommandsStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          synth: {
            commands: ['yarn install', 'yarn cdk synth'],
          },
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Source: Match.objectLike({
          BuildSpec: Match.serializedJson(
            Match.objectLike({
              phases: Match.objectLike({
                build: Match.objectLike({
                  commands: Match.arrayWith(['yarn install', 'yarn cdk synth']),
                }),
              }),
            }),
          ),
        }),
      });
    });

    void it('passes installCommands to the ShellStep', () => {
      const app = new App();
      const stack = new Stack(app, 'InstallCommandsStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          synth: {
            installCommands: ['n 22'],
          },
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Source: Match.objectLike({
          BuildSpec: Match.serializedJson(
            Match.objectLike({
              phases: Match.objectLike({
                install: Match.objectLike({
                  commands: Match.arrayWith(['n 22']),
                }),
              }),
            }),
          ),
        }),
      });
    });

    void it('uses AMAZON_LINUX_2023_5 build image by default', () => {
      const app = new App();
      const stack = new Stack(app, 'DefaultImageStack');

      new AmplifyPipelineConstruct(stack, 'Pipeline', defaultPipelineProps());

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          Image: 'aws/codebuild/amazonlinux-x86_64-standard:5.0',
        }),
      });
    });

    void it('allows overriding buildImage via synth config', () => {
      const app = new App();
      const stack = new Stack(app, 'CustomImageStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          synth: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          },
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          Image: 'aws/codebuild/standard:7.0',
        }),
      });
    });
  });

  void describe('multi-branch pipelines', () => {
    void it('creates separate pipelines for each branch', () => {
      const app = new App();
      const stack = new Stack(app, 'MultiBranchStack');

      const construct = new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            { branch: 'main', stages: [{ name: 'prod' }] },
            { branch: 'develop', stages: [{ name: 'alpha' }] },
          ],
        }),
      );

      assert.strictEqual(construct.codePipelines.size, 2);
      assert.ok(construct.codePipelines.has('main'));
      assert.ok(construct.codePipelines.has('develop'));

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 2);
    });
  });

  void describe('validation', () => {
    void it('throws on invalid connectionArn', () => {
      const app = new App();
      const stack = new Stack(app, 'InvalidArnStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              source: {
                repo: 'my-org/my-app',
                connectionArn: 'not-a-valid-arn',
              },
            }),
          ),
        /connectionArn.*valid CodeConnections ARN/,
      );
    });

    void it('throws on invalid repo format', () => {
      const app = new App();
      const stack = new Stack(app, 'InvalidRepoStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              source: {
                repo: 'no-slash',
                connectionArn: VALID_CONNECTION_ARN,
              },
            }),
          ),
        /repo.*owner\/repo/,
      );
    });

    void it('throws on empty branches array', () => {
      const app = new App();
      const stack = new Stack(app, 'EmptyBranchesStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [],
            }),
          ),
        /branches.*must not be empty/,
      );
    });

    void it('throws on duplicate branch names', () => {
      const app = new App();
      const stack = new Stack(app, 'DupBranchStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                { branch: 'main', stages: [{ name: 'beta' }] },
                { branch: 'main', stages: [{ name: 'prod' }] },
              ],
            }),
          ),
        /duplicate branch name.*main/,
      );
    });

    void it('throws on duplicate stage names within a branch', () => {
      const app = new App();
      const stack = new Stack(app, 'DupStageStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                {
                  branch: 'main',
                  stages: [{ name: 'beta' }, { name: 'beta' }],
                },
              ],
            }),
          ),
        /duplicate stage name.*beta/,
      );
    });

    void it('throws on empty stages array for a branch', () => {
      const app = new App();
      const stack = new Stack(app, 'EmptyStagesStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                {
                  branch: 'main',
                  stages: [],
                },
              ],
            }),
          ),
        /empty.*stages.*array/,
      );
    });

    void it('throws when bakeTime exceeds 55 minutes', () => {
      const app = new App();
      const stack = new Stack(app, 'BakeTimeLimitStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                {
                  branch: 'main',
                  stages: [{ name: 'beta', bakeTime: Duration.minutes(60) }],
                },
              ],
            }),
          ),
        /bakeTime.*exceeds 55 minutes/,
      );
    });

    void it('throws when stageFactory produces no stacks', () => {
      const app = new App();
      const stack = new Stack(app, 'EmptyStageStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              stageFactory: () => {
                // Intentionally empty — creates no stacks
              },
            }),
          ),
        /stage.*beta.*contains no stacks/i,
      );
    });

    void it('throws when crossAccountKeys not set for cross-account deploys', () => {
      const app = new App();
      const stack = new Stack(app, 'CrossAccountStack', {
        env: { account: '111111111111', region: 'us-east-1' },
      });

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                {
                  branch: 'main',
                  stages: [
                    {
                      name: 'beta',
                      env: { account: '222222222222', region: 'us-east-1' },
                    },
                  ],
                },
              ],
            }),
          ),
        /crossAccountKeys must be true/,
      );
    });

    void it('emits CDK warning annotation when computeType is SMALL', () => {
      const app = new App();
      const stack = new Stack(app, 'SmallComputeStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          synth: {
            computeType: codebuild.ComputeType.SMALL,
          },
        }),
      );

      const annotations = Annotations.fromStack(stack);
      annotations.hasWarning(
        '/SmallComputeStack/Pipeline',
        Match.stringLikeRegexp('ComputeType\\.SMALL.*3GB'),
      );
    });
  });

  void describe('ManualApprovalStep', () => {
    void it('adds ManualApprovalStep when requireApproval is true', () => {
      const app = new App();
      const stack = new Stack(app, 'ApprovalStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            {
              branch: 'main',
              stages: [
                { name: 'beta' },
                { name: 'prod', requireApproval: true },
              ],
            },
          ],
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Category: 'Approval',
                  Provider: 'Manual',
                }),
              }),
            ]),
          }),
        ]),
      });
    });

    void it('does not add ManualApprovalStep when requireApproval is false', () => {
      const app = new App();
      const stack = new Stack(app, 'NoApprovalStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            {
              branch: 'main',
              stages: [{ name: 'beta', requireApproval: false }],
            },
          ],
        }),
      );

      const template = Template.fromStack(stack);
      const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
      const pipelineKey = Object.keys(pipelines)[0];
      const stages = (pipelines[pipelineKey] as any).Properties.Stages as any[];

      for (const stage of stages) {
        for (const action of stage.Actions ?? []) {
          if (action.ActionTypeId?.Category === 'Approval') {
            assert.fail('Should not have an approval action');
          }
        }
      }
    });
  });

  void describe('bakeTime', () => {
    void it('creates CodeBuild sleep step when bakeTime is set', () => {
      const app = new App();
      const stack = new Stack(app, 'BakeTimeStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            {
              branch: 'main',
              stages: [{ name: 'beta', bakeTime: Duration.minutes(10) }],
            },
          ],
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Source: Match.objectLike({
          BuildSpec: Match.serializedJson(
            Match.objectLike({
              phases: Match.objectLike({
                build: Match.objectLike({
                  commands: Match.arrayWith([
                    Match.stringLikeRegexp('sleep 600'),
                  ]),
                }),
              }),
            }),
          ),
        }),
      });
    });
  });

  void describe('_sourceOverride', () => {
    void it('replaces GitHub source with custom source', () => {
      const app = new App();
      const stack = new Stack(app, 'OverrideStack');

      const bucket = new Bucket(stack, 'SourceBucket');
      const s3Source = CodePipelineSource.s3(bucket, 'source.zip');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          _sourceOverride: s3Source,
        }),
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Category: 'Source',
                  Provider: 'S3',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  void describe('selfMutation and crossAccountKeys', () => {
    void it('enables self-mutation by default', () => {
      const app = new App();
      const stack = new Stack(app, 'SelfMutationStack');

      new AmplifyPipelineConstruct(stack, 'Pipeline', defaultPipelineProps());

      const template = Template.fromStack(stack);
      const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
      const pipelineKey = Object.keys(pipelines)[0];
      const stages = (pipelines[pipelineKey] as any).Properties.Stages as any[];

      const stageNames = stages.map((s: any) => s.Name);
      assert.ok(
        stageNames.some(
          (n: string) => n.includes('UpdatePipeline') || n === 'UpdatePipeline',
        ),
        `Expected UpdatePipeline stage for self-mutation, got: ${stageNames}`,
      );
    });

    void it('disables self-mutation when set to false', () => {
      const app = new App();
      const stack = new Stack(app, 'NoSelfMutationStack');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          selfMutation: false,
        }),
      );

      const template = Template.fromStack(stack);
      const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
      const pipelineKey = Object.keys(pipelines)[0];
      const stages = (pipelines[pipelineKey] as any).Properties.Stages as any[];

      const stageNames = stages.map((s: any) => s.Name);
      assert.ok(
        !stageNames.some((n: string) => n.includes('UpdatePipeline')),
        `Should NOT have UpdatePipeline stage, got: ${stageNames}`,
      );
    });
  });

  void describe('stage stack discovery', () => {
    void it('discovers multiple stacks in a single stage', () => {
      const app = new App();
      const stack = new Stack(app, 'MultiStackStage');

      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            {
              branch: 'main',
              stages: [{ name: 'prod' }],
            },
          ],
          stageFactory: (scope) => {
            new Stack(scope, 'FrontendStack');
            new Stack(scope, 'BackendStack');
          },
        }),
      );

      const template = Template.fromStack(stack);
      const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
      const pipelineKey = Object.keys(pipelines)[0];
      const stages = (pipelines[pipelineKey] as any).Properties.Stages as any[];

      const deployStage = stages.find((s: any) => s.Name.includes('prod'));
      assert.ok(deployStage, 'Should have prod deploy stage');

      const deployActions = deployStage.Actions.filter(
        (a: any) =>
          a.ActionTypeId?.Category === 'Deploy' &&
          a.ActionTypeId?.Provider === 'CloudFormation',
      );
      assert.ok(
        deployActions.length >= 2,
        `Expected at least 2 deploy actions for 2 stacks, got ${deployActions.length}`,
      );
    });
  });

  void describe('async create()', () => {
    void it('creates pipeline with async stageFactory', async () => {
      const app = new App();
      const stack = new Stack(app, 'AsyncStack');

      const construct = await AmplifyPipelineConstruct.create(
        stack,
        'Pipeline',
        defaultPipelineProps({
          stageFactory: async (scope) => {
            new Stack(scope, 'AsyncAppStack');
          },
        }),
      );

      assert.strictEqual(construct.codePipelines.size, 1);
      assert.ok(construct.codePipelines.has('main'));

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        PipelineType: 'V2',
      });
    });

    void it('throws when async factory used in sync constructor', () => {
      const app = new App();
      const stack = new Stack(app, 'AsyncInSyncStack');

      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              stageFactory: async () => {
                // async factory in sync constructor
              },
            }),
          ),
        /async stageFactory.*AmplifyPipelineConstruct\.create/,
      );
    });
  });
});

void describe('getStageConfig', () => {
  void it('returns undefined when not in pipeline context', () => {
    const result = getStageConfig();
    assert.strictEqual(result, undefined);
  });

  void it('returns typed config when in pipeline context', () => {
    const mockStageConfig = {
      name: 'beta',
      config: { domain: 'beta.myapp.com' },
    };

    // Simulate pipeline scope with context
    const app = new App();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stage = new (require('aws-cdk-lib').Stage)(app, 'TestStage');
    stage.node.setContext(
      'AMPLIFY_STAGE_CONFIG',
      JSON.stringify(mockStageConfig),
    );

    (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__ = stage;
    try {
      const result = getStageConfig<{ domain: string }>();
      assert.ok(result);
      assert.strictEqual(result.name, 'beta');
      assert.strictEqual(result.config?.domain, 'beta.myapp.com');
    } finally {
      delete (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__;
    }
  });

  void it('returns undefined when scope exists but no context', () => {
    const app = new App();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stage = new (require('aws-cdk-lib').Stage)(app, 'EmptyStage');

    (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__ = stage;
    try {
      const result = getStageConfig();
      assert.strictEqual(result, undefined);
    } finally {
      delete (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__;
    }
  });
});

void describe('environment property', () => {
  void it('sets process.env during stageFactory and restores after', () => {
    const app = new App();
    const stack = new Stack(app, 'EnvStack');

    const capturedEnv: Record<string, string | undefined> = {};
    const originalFoo = process.env.TEST_PIPELINE_FOO;
    process.env.TEST_PIPELINE_FOO = 'original';

    try {
      new AmplifyPipelineConstruct(
        stack,
        'Pipeline',
        defaultPipelineProps({
          branches: [
            {
              branch: 'main',
              stages: [
                {
                  name: 'beta',
                  environment: {
                    TEST_PIPELINE_FOO: 'overridden',
                    TEST_PIPELINE_BAR: 'new-value',
                  },
                },
              ],
            },
          ],
          stageFactory: (scope) => {
            capturedEnv.TEST_PIPELINE_FOO = process.env.TEST_PIPELINE_FOO;
            capturedEnv.TEST_PIPELINE_BAR = process.env.TEST_PIPELINE_BAR;
            new Stack(scope, 'AppStack');
          },
        }),
      );

      assert.strictEqual(capturedEnv.TEST_PIPELINE_FOO, 'overridden');
      assert.strictEqual(capturedEnv.TEST_PIPELINE_BAR, 'new-value');

      assert.strictEqual(process.env.TEST_PIPELINE_FOO, 'original');
      assert.strictEqual(process.env.TEST_PIPELINE_BAR, undefined);
    } finally {
      if (originalFoo === undefined) {
        delete process.env.TEST_PIPELINE_FOO;
      } else {
        process.env.TEST_PIPELINE_FOO = originalFoo;
      }
      delete process.env.TEST_PIPELINE_BAR;
    }
  });

  void it('restores process.env even when stageFactory throws', () => {
    const app = new App();
    const stack = new Stack(app, 'EnvThrowStack');

    const originalFoo = process.env.TEST_PIPELINE_THROW;

    try {
      assert.throws(
        () =>
          new AmplifyPipelineConstruct(
            stack,
            'Pipeline',
            defaultPipelineProps({
              branches: [
                {
                  branch: 'main',
                  stages: [
                    {
                      name: 'beta',
                      environment: { TEST_PIPELINE_THROW: 'set-before-throw' },
                    },
                  ],
                },
              ],
              stageFactory: () => {
                throw new Error('intentional test error');
              },
            }),
          ),
        /intentional test error/,
      );

      assert.strictEqual(
        process.env.TEST_PIPELINE_THROW,
        originalFoo ?? undefined,
      );
    } finally {
      delete process.env.TEST_PIPELINE_THROW;
    }
  });

  void it('sets process.env during async stageFactory and restores after', async () => {
    const app = new App();
    const stack = new Stack(app, 'AsyncEnvStack');

    const capturedEnv: Record<string, string | undefined> = {};

    await AmplifyPipelineConstruct.create(
      stack,
      'Pipeline',
      defaultPipelineProps({
        branches: [
          {
            branch: 'main',
            stages: [
              {
                name: 'beta',
                environment: {
                  TEST_PIPELINE_ASYNC: 'async-value',
                },
              },
            ],
          },
        ],
        stageFactory: async (scope) => {
          capturedEnv.TEST_PIPELINE_ASYNC = process.env.TEST_PIPELINE_ASYNC;
          new Stack(scope, 'AppStack');
        },
      }),
    );

    assert.strictEqual(capturedEnv.TEST_PIPELINE_ASYNC, 'async-value');
    assert.strictEqual(process.env.TEST_PIPELINE_ASYNC, undefined);
  });
});

void describe('triggerFilters', () => {
  void it('adds trigger filter configuration to the pipeline', () => {
    const app = new App();
    const stack = new Stack(app, 'TriggerFilterStack');

    new AmplifyPipelineConstruct(
      stack,
      'Pipeline',
      defaultPipelineProps({
        source: {
          repo: 'my-org/my-app',
          connectionArn: VALID_CONNECTION_ARN,
          triggerFilters: ['packages/backend/**', 'shared/**'],
        },
      }),
    );

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Triggers: Match.arrayWith([
        Match.objectLike({
          GitConfiguration: Match.objectLike({
            Push: Match.arrayWith([
              Match.objectLike({
                Branches: Match.objectLike({
                  Includes: ['main'],
                }),
                FilePaths: Match.objectLike({
                  Includes: ['packages/backend/**', 'shared/**'],
                }),
              }),
            ]),
          }),
        }),
      ]),
    });
  });

  void it('throws when source.triggerOnPush is true and triggerFilters are set', () => {
    const app = new App();
    const stack = new Stack(app, 'TriggerConflictStack');

    assert.throws(
      () =>
        new AmplifyPipelineConstruct(
          stack,
          'Pipeline',
          defaultPipelineProps({
            source: {
              repo: 'my-org/my-app',
              connectionArn: VALID_CONNECTION_ARN,
              triggerOnPush: true,
              triggerFilters: ['packages/**'],
            },
          }),
        ),
      /source\.triggerOnPush cannot be true when source\.triggerFilters are set/,
    );
  });

  void it('does not throw when source.triggerOnPush is undefined and triggerFilters are set', () => {
    const app = new App();
    const stack = new Stack(app, 'TriggerNoConflictStack');

    assert.doesNotThrow(
      () =>
        new AmplifyPipelineConstruct(
          stack,
          'Pipeline',
          defaultPipelineProps({
            source: {
              repo: 'my-org/my-app',
              connectionArn: VALID_CONNECTION_ARN,
              triggerFilters: ['packages/**'],
            },
          }),
        ),
    );
  });
});

void describe('branch name collision detection', () => {
  void it('throws when branch names collide after sanitization', () => {
    const app = new App();
    const stack = new Stack(app, 'CollisionStack');

    assert.throws(
      () =>
        new AmplifyPipelineConstruct(
          stack,
          'Pipeline',
          defaultPipelineProps({
            branches: [
              { branch: 'feature/foo', stages: [{ name: 'beta' }] },
              { branch: 'feature_foo', stages: [{ name: 'alpha' }] },
            ],
          }),
        ),
      /produces a collision after sanitization/,
    );
  });

  void it('does not throw for distinct branches after sanitization', () => {
    const app = new App();
    const stack = new Stack(app, 'NoCollisionStack');

    assert.doesNotThrow(
      () =>
        new AmplifyPipelineConstruct(
          stack,
          'Pipeline',
          defaultPipelineProps({
            branches: [
              { branch: 'feature/foo', stages: [{ name: 'beta' }] },
              { branch: 'feature/bar', stages: [{ name: 'alpha' }] },
            ],
          }),
        ),
    );
  });
});

void describe('withPipelineScope', () => {
  void it('sets globalThis scope during fn and clears after', async () => {
    const app = new App();
    const stage = new Stage(app, 'ScopeTestStage');
    const stageConfig = { name: 'beta', config: { domain: 'test.com' } };

    let scopeDuringFn: any;
    let contextDuringFn: string | undefined;

    await withPipelineScope(stage, stageConfig, () => {
      scopeDuringFn = (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__;
      contextDuringFn = stage.node.tryGetContext('AMPLIFY_STAGE_CONFIG');
    });

    assert.strictEqual(scopeDuringFn, stage);
    assert.ok(contextDuringFn);
    const parsed = JSON.parse(contextDuringFn!);
    assert.strictEqual(parsed.name, 'beta');
    assert.strictEqual(parsed.config.domain, 'test.com');

    assert.strictEqual(
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
    );
  });

  void it('sets AMPLIFY_STAGE_NAME context', async () => {
    const app = new App();
    const stage = new Stage(app, 'NameContextStage');
    const stageConfig = { name: 'prod' };

    await withPipelineScope(stage, stageConfig, () => {});

    assert.strictEqual(stage.node.tryGetContext('AMPLIFY_STAGE_NAME'), 'prod');
  });

  void it('clears globalThis even when fn throws', async () => {
    const app = new App();
    const stage = new Stage(app, 'ThrowScopeStage');
    const stageConfig = { name: 'beta' };

    await assert.rejects(
      () =>
        withPipelineScope(stage, stageConfig, () => {
          throw new Error('test error');
        }),
      /test error/,
    );

    assert.strictEqual(
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
    );
  });

  void it('works with async fn', async () => {
    const app = new App();
    const stage = new Stage(app, 'AsyncScopeStage');
    const stageConfig = { name: 'gamma' };

    let scopeSet = false;
    await withPipelineScope(stage, stageConfig, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      scopeSet = (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__ === stage;
    });

    assert.strictEqual(scopeSet, true);
    assert.strictEqual(
      (globalThis as any).__AMPLIFY_PIPELINE_SCOPE__,
      undefined,
    );
  });
});
