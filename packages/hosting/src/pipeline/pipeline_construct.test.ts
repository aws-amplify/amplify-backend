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
 * Shim + glue coverage for `AmplifyPipelineConstruct`.
 *
 * The generic pipeline behavior (source, synth, branches, approvals, bake time,
 * validation, cross-account, trigger filters) is owned and tested upstream by
 * `@aws-blocks/pipeline`. These tests assert only the seam this package adds:
 *   1. the construct IS the upstream `Pipeline` (thin subclass, real delegation),
 *   2. it still synthesizes a working CodePipeline (smoke), and
 *   3. the Amplify-specific `_postStageHook` steps are injected onto the right
 *      stage (the one piece of behavior aws-blocks does not model).
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

  // Canary for the upstream validation contract. The full validation suite
  // (empty branches, duplicate names, bake time, cross-account, ComputeType,
  // etc.) is owned and tested by @aws-blocks/pipeline; re-testing all of it here
  // would re-fork what this shim exists to delete. This single case confirms the
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
    assert.ok(pipeline instanceof AmplifyPipelineConstruct);
    assert.ok(pipeline.codePipelines.get('main'));
  });
});

void describe('AmplifyPipelineConstruct — _postStageHook injection', () => {
  void it('appends the hook steps as a post-deploy action on the matching stage', () => {
    const stack = makeStack();
    let hookStageName: string | undefined;

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
      _postStageHook: ({ source, stage, stageConfig }) => {
        hookStageName = stageConfig.name;
        // The hook receives the branch source and the stage scope.
        assert.ok(source, 'hook should receive a source producer');
        assert.ok(stage instanceof Stage, 'hook should receive the Stage');
        return [
          new ShellStep(`DeployHosting-${stageConfig.name}`, {
            input: source,
            commands: ['echo deploy-hosting'],
          }),
        ];
      },
    });

    assert.strictEqual(hookStageName, 'beta', 'hook should run for the stage');

    // The injected step becomes a CodeBuild action in the pipeline. With
    // self-mutation off, the only CodeBuild projects are Synth + our step.
    const template = Template.fromStack(stack);
    const projects = template.findResources('AWS::CodeBuild::Project');
    const buildSpecs = Object.values(projects).map((p: any) =>
      JSON.stringify(p.Properties?.Source?.BuildSpec ?? ''),
    );
    assert.ok(
      buildSpecs.some((b) => b.includes('echo deploy-hosting')),
      'expected the injected DeployHosting step to appear as a CodeBuild action',
    );
  });

  void it('does not require a hook (plain pipelines still build)', () => {
    const stack = makeStack();
    const pipeline = new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
    });
    // No _postStageHook → behaves exactly like the upstream Pipeline.
    assert.ok(pipeline.codePipelines.get('main'));
    Template.fromStack(stack).resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  });

  // Guards the id-prefix coupling to @aws-blocks/pipeline's construct naming
  // (see resolveSource). For every stage across MULTIPLE branches, the hook
  // must receive a real source file set from that stage's OWN branch pipeline.
  // If upstream renames its stage / branch-pipeline constructs, this resolution
  // fails loud (resolveSource throws) so CI catches it instead of silently
  // dropping the hosting deploy step.
  void it('resolves each stage source from its own branch pipeline (multi-branch)', () => {
    const stack = makeStack();
    const seen = new Map<string, boolean>();

    new AmplifyPipelineConstruct(stack, 'Pipeline', {
      ...baseProps(stack),
      branches: [
        { branch: 'main', stages: [{ name: 'beta' }, { name: 'prod' }] },
        { branch: 'staging', stages: [{ name: 'gamma' }] },
      ],
      _postStageHook: ({ source, stageConfig }) => {
        // A real, resolved source (not an undefined cast) is required here —
        // the step below feeds it straight into CodeBuildStep.input.
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

    // The hook ran for every stage across both branches with a valid source.
    assert.deepStrictEqual(
      [...seen.keys()].sort(),
      ['beta', 'gamma', 'prod'],
      'hook should run once per stage across all branches',
    );

    // Each branch pipeline gets its injected DeployHosting CodeBuild action.
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
      'expected one injected DeployHosting step per stage (beta, prod, gamma)',
    );
  });
});
