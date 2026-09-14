/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack, Stage } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Pipeline as BlocksPipeline } from '@aws-blocks/pipeline';
import { AmplifyPipelineConstruct } from './pipeline_construct.js';
import type { PipelineProps } from './types.js';

/**
 * Shim coverage for `AmplifyPipelineConstruct`.
 *
 * The construct is a thin named re-export (subclass) of `@aws-blocks/pipeline`'s
 * `Pipeline`; all generic pipeline behavior — including the public `postStage`
 * hook (per-stage post-deploy steps, source resolution, and bake-after-postStage
 * ordering) — is owned and tested upstream. These tests assert only that:
 *   1. the construct IS the upstream `Pipeline` (real delegation),
 *   2. it synthesizes a working CodePipeline (smoke),
 *   3. it delegates upstream validation, and
 *   4. `postStage` steps supplied through it land as CodeBuild actions
 *      (integration smoke over the public hook, sync and async paths).
 */

const ARN =
  'arn:aws:codeconnections:us-east-1:123456789012:connection/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';

const makeStack = () => {
  const app = new App();
  return new Stack(app, 'PipelineStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
};

// A source override so tests don't require a live CodeConnections handshake.
const sourceOverride = (stack: Stack) =>
  CodePipelineSource.s3(
    new Bucket(stack, 'Src', {}),
    'source.zip',
  ) as unknown as PipelineProps['_sourceOverride'];

const baseProps = (stack: Stack): PipelineProps => ({
  source: { repo: 'my-org/my-app', connectionArn: ARN },
  synth: { commands: ['echo synth'] },
  selfMutation: false,
  branches: [{ branch: 'main', stages: [{ name: 'beta' }] }],
  stageFactory: (scope) => {
    new Stack(scope, 'AppStack');
  },
  _sourceOverride: sourceOverride(stack),
});

void describe('AmplifyPipelineConstruct — shim parity', () => {
  void it('is a subclass of the upstream @aws-blocks/pipeline Pipeline', () => {
    assert.ok(
      AmplifyPipelineConstruct.prototype instanceof BlocksPipeline,
      'AmplifyPipelineConstruct should extend the aws-blocks Pipeline',
    );
  });

  void it('synthesizes a CodePipeline and exposes the codePipelines map (smoke)', () => {
    const stack = makeStack();
    const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
    });

    // The public surface aws-blocks provides is preserved.
    assert.ok(pipeline.codePipelines.get('main'), 'expected a "main" pipeline');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  });

  // Canary for the upstream validation contract. The full validation suite is
  // owned and tested by @aws-blocks/pipeline; this single case confirms the
  // delegation is live — if a dependency upgrade ever stops enforcing the public
  // validation contract, this trips instead of silently accepting bad input.
  void it('delegates upstream prop validation (invalid connection ARN throws)', () => {
    const stack = makeStack();
    assert.throws(
      () =>
        new AmplifyPipelineConstruct(stack, 'Pipeline', {
          ...baseProps(stack),
          source: { repo: 'my-org/my-app', connectionArn: 'not-a-valid-arn' },
        }),
      /connectionArn|ARN/i,
      'expected upstream Pipeline to reject an invalid CodeConnections ARN',
    );
  });

  void it('supports the async create() path', async () => {
    const stack = makeStack();
    const pipeline = await AmplifyPipelineConstruct.create(stack, 'Pipeline', {
      ...baseProps(stack),
      stageFactory: async (scope) => {
        await Promise.resolve();
        new Stack(scope, 'AppStack');
      },
    });
    assert.ok(pipeline.codePipelines.get('main'));
  });
});

void describe('AmplifyPipelineConstruct — postStage passthrough', () => {
  void it('attaches postStage steps as a post-deploy CodeBuild action on the stage', () => {
    const stack = makeStack();
    let hookStageName: string | undefined;

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
      postStage: ({ source, stage, stageConfig }) => {
        hookStageName = stageConfig.name;
        // The upstream hook hands us the resolved branch source + the Stage.
        assert.ok(source, 'postStage should receive a source producer');
        assert.ok(stage instanceof Stage, 'postStage should receive the Stage');
        return [
          new ShellStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            commands: ['echo deploy-hosting'],
          }),
        ];
      },
    });

    assert.strictEqual(
      hookStageName,
      'beta',
      'postStage should run for the stage',
    );

    const template = Template.fromStack(stack);
    const projects = template.findResources('AWS::CodeBuild::Project');
    const buildSpecs = Object.values(projects).map((p: any) =>
      JSON.stringify(p.Properties?.Source?.BuildSpec ?? ''),
    );
    assert.ok(
      buildSpecs.some((b) => b.includes('echo deploy-hosting')),
      'expected the postStage DeployHosting step to appear as a CodeBuild action',
    );
  });

  void it('does not require postStage (plain pipelines still build)', () => {
    const stack = makeStack();
    const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
    });
    assert.ok(pipeline.codePipelines.get('main'));
    Template.fromStack(stack).resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  });

  // Each stage across MULTIPLE branches must receive a real source file set from
  // its OWN branch pipeline (upstream `postStage` resolves this — the shim no
  // longer matches construct ids itself).
  void it('runs postStage per stage with a resolved source (multi-branch)', () => {
    const stack = makeStack();
    const seen = new Map<string, boolean>();

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
      branches: [
        { branch: 'main', stages: [{ name: 'beta' }, { name: 'prod' }] },
        { branch: 'staging', stages: [{ name: 'gamma' }] },
      ],
      postStage: ({ source, stageConfig }) => {
        assert.ok(
          source,
          `expected a resolved source for stage "${stageConfig.name}"`,
        );
        seen.set(stageConfig.name, true);
        return [
          new ShellStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            commands: ['echo deploy-hosting'],
          }),
        ];
      },
    });

    assert.deepStrictEqual(
      [...seen.keys()].sort(),
      ['beta', 'gamma', 'prod'],
      'postStage should run once per stage across all branches',
    );

    const template = Template.fromStack(stack);
    const projects = template.findResources('AWS::CodeBuild::Project');
    const buildSpecs = Object.values(projects).map((p: any) =>
      JSON.stringify(p.Properties?.Source?.BuildSpec ?? ''),
    );
    const deployHostingActions = buildSpecs.filter((b) =>
      b.includes('echo deploy-hosting'),
    );
    assert.strictEqual(
      deployHostingActions.length,
      3,
      'expected one postStage DeployHosting step per stage (beta, prod, gamma)',
    );
  });

  void it('attaches postStage steps via the async create() path', async () => {
    const stack = makeStack();
    let hookStageName: string | undefined;

    await AmplifyPipelineConstruct.create(stack, 'Pipeline', {
      ...baseProps(stack),
      stageFactory: async (scope) => {
        await Promise.resolve();
        new Stack(scope, 'AppStack');
      },
      postStage: ({ source, stage, stageConfig }) => {
        hookStageName = stageConfig.name;
        assert.ok(
          source,
          'postStage should receive a resolved source producer',
        );
        assert.ok(stage instanceof Stage, 'postStage should receive the Stage');
        return [
          new ShellStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            commands: ['echo deploy-hosting-async'],
          }),
        ];
      },
    });

    assert.strictEqual(
      hookStageName,
      'beta',
      'postStage should run for the stage',
    );

    const template = Template.fromStack(stack);
    const projects = template.findResources('AWS::CodeBuild::Project');
    const buildSpecs = Object.values(projects).map((p: any) =>
      JSON.stringify(p.Properties?.Source?.BuildSpec ?? ''),
    );
    assert.ok(
      buildSpecs.some((b) => b.includes('echo deploy-hosting-async')),
      'expected the async postStage DeployHosting step as a CodeBuild action',
    );
  });
});
