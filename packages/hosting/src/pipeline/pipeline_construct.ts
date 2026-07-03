// The generic CI/CD pipeline construct now lives in `@aws-blocks/pipeline`
// (exported there as `Pipeline`). This module is a THIN wrapper that:
//
//   1. re-exports it under the historical `AmplifyPipelineConstruct` name, and
//   2. adds the one piece of Amplify-specific behavior that aws-blocks does not
//      model — the two-phase hosting deploy, injected via `_postStageHook`.
//
// Everything else (source, synth, branches, approvals, bake time, trigger
// filters, cross-account, validation, sync/async construction) is delegated to
// aws-blocks unchanged. See ./pipeline_factory.ts for `definePipeline()`, which
// supplies the `_postStageHook` used here.
import type * as cdk from 'aws-cdk-lib';
import {
  type CodeBuildStep,
  CodePipeline,
  type IFileSetProducer,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { Pipeline } from '@aws-blocks/pipeline';
import type { Construct } from 'constructs';
import type { PipelineProps, PipelineStageConfig } from './types.js';

/**
 * CDK Pipelines-based CI/CD pipeline construct (L3).
 *
 * A thin wrapper over `@aws-blocks/pipeline`'s `Pipeline`. It behaves
 * identically to the upstream construct — one self-mutating CodePipeline V2 per
 * branch, deploying to ordered stages with optional approval and bake time —
 * with a single addition: when `_postStageHook` is supplied (by
 * `definePipeline()`), the returned post-deploy steps are appended to each
 * stage. That hook is how the Amplify two-phase deployment (deploy backend →
 * generate outputs → build frontend → deploy hosting) is expressed on top of
 * the generic pipeline.
 *
 * The hook must observe per-stage state captured *while each stage's
 * `stageFactory` runs* (e.g. the backend `CfnOutput` published to `globalThis`
 * by `defineBackend()`), so this wrapper wraps the caller's `stageFactory` to
 * invoke the hook inline and stashes the result, then appends the steps to the
 * built `StageDeployment` via `addPost()`.
 * @template TConfig - Type of the user-defined `config` object passed to each stage.
 * @example Sync stageFactory
 * ```ts
 * new AmplifyPipelineConstruct(stack, 'Pipeline', {
 *   source: {
 *     repo: 'my-org/my-app',
 *     connectionArn: 'arn:aws:codeconnections:us-east-1:123456789:connection/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
 *   },
 *   branches: [
 *     {
 *       branch: 'main',
 *       stages: [
 *         { name: 'beta' },
 *         { name: 'prod', requireApproval: true, config: { domain: 'myapp.com' } },
 *       ],
 *     },
 *   ],
 *   stageFactory: (scope, stageConfig) => {
 *     new MyAppStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 * @example Async stageFactory
 * ```ts
 * await AmplifyPipelineConstruct.create(stack, 'Pipeline', {
 *   source: { repo: 'my-org/my-app', connectionArn: '...' },
 *   branches: [{ branch: 'main', stages: [{ name: 'prod' }] }],
 *   stageFactory: async (scope, stageConfig) => {
 *     new MyAppStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 */
export class AmplifyPipelineConstruct<
  TConfig = Record<string, unknown>,
> extends Pipeline<TConfig> {
  /**
   * Create an AmplifyPipelineConstruct with a synchronous stageFactory.
   *
   * For an async stageFactory, use the static
   * `AmplifyPipelineConstruct.create()` method instead.
   *
   * `_internal` is an async-init escape hatch (marker + pipelines map) forwarded
   * to the upstream `Pipeline`; when present the base defers pipeline building,
   * so the `_postStageHook` steps are applied later by `create()` instead.
   */
  constructor(
    scope: Construct,
    id: string,
    props: PipelineProps<TConfig>,
    _internal?: {
      marker: symbol;
      pipelines: Map<string, CodePipeline>;
    },
  ) {
    // Steps produced by _postStageHook, keyed by stage name. Populated inline
    // by the wrapped stageFactory as each stage synthesizes, then drained onto
    // the built StageDeployments after super() returns.
    const postSteps = new Map<string, Array<ShellStep | CodeBuildStep>>();
    super(scope, id, wrapProps(props, postSteps), _internal);
    // In async-init mode the base skips building; create() applies the hook.
    if (!_internal) {
      applyPostStageHook(this.codePipelines, postSteps);
    }
  }

  /**
   * Async factory for pipelines that use an async stageFactory.
   *
   * Use this when your stageFactory needs to `await` async operations. Mirrors
   * `Pipeline.create()` and additionally applies the `_postStageHook` steps.
   */
  // eslint-disable-next-line no-restricted-syntax
  static async create<TConfig = Record<string, unknown>>(
    scope: Construct,
    id: string,
    props: PipelineProps<TConfig>,
  ): Promise<AmplifyPipelineConstruct<TConfig>> {
    const postSteps = new Map<string, Array<ShellStep | CodeBuildStep>>();
    const instance = (await Pipeline.create<TConfig>(
      scope,
      id,
      wrapProps(props, postSteps),
    )) as AmplifyPipelineConstruct<TConfig>;
    // Re-assign the prototype so callers get an AmplifyPipelineConstruct
    // instance (Pipeline.create constructs a base Pipeline internally).
    Object.setPrototypeOf(instance, AmplifyPipelineConstruct.prototype);
    applyPostStageHook(instance.codePipelines, postSteps);
    return instance;
  }
}

/**
 * Wrap the caller's props so that `_postStageHook` is invoked inline while each
 * stage's `stageFactory` runs, capturing the returned steps for later
 * injection. The `_postStageHook` prop itself is stripped before delegating to
 * aws-blocks (which does not understand it).
 */
const wrapProps = <TConfig>(
  props: PipelineProps<TConfig>,
  postSteps: Map<string, Array<ShellStep | CodeBuildStep>>,
): PipelineProps<TConfig> => {
  const { _postStageHook, stageFactory, ...rest } = props;

  if (!_postStageHook) {
    return props;
  }

  // NOTE: `wrappedStageFactory` must NOT be an async function. aws-blocks'
  // sync constructor rejects `stageFactory.constructor.name === 'AsyncFunction'`
  // to steer callers to `Pipeline.create()`. It stays a plain function and
  // defers the await-after-factory case to `runHookAfter` (a real async
  // helper) so the sync path is preserved and no `.then()` is needed.
  const runHook = (
    stage: cdk.Stage,
    stageConfig: PipelineStageConfig<TConfig>,
  ) => {
    const steps = _postStageHook({
      // The synth step's first input is the pipeline source file set — reuse
      // it as the hosting deploy step's input rather than creating a second
      // source action.
      source: resolveSource(stage),
      stage,
      stageConfig,
    });
    if (steps.length > 0) {
      // aws-blocks names the DeployStage `${id}-${safeBranch}-Stage-${name}`,
      // which becomes the StageDeployment.stageName. Key on that so post
      // steps land on the correct stage even across multiple branches.
      postSteps.set(stage.stageName, steps);
    }
  };

  const runHookAfter = async (
    pending: Promise<void>,
    stage: cdk.Stage,
    stageConfig: PipelineStageConfig<TConfig>,
  ): Promise<void> => {
    await pending;
    runHook(stage, stageConfig);
  };

  const wrappedStageFactory = (
    stage: cdk.Stage,
    stageConfig: PipelineStageConfig<TConfig>,
  ): void | Promise<void> => {
    const result = stageFactory(stage, stageConfig);
    if (result && typeof (result as Promise<void>).then === 'function') {
      return runHookAfter(result as Promise<void>, stage, stageConfig);
    }
    runHook(stage, stageConfig);
    return result;
  };

  return { ...rest, stageFactory: wrappedStageFactory };
};

/**
 * Resolve the pipeline source file set for a given stage.
 *
 * The `_postStageHook` needs an `IFileSetProducer` to use as the hosting deploy
 * step's `input` — specifically the source checkout of the SAME branch pipeline
 * the stage belongs to (each branch has its own source action).
 *
 * aws-blocks names the branch CodePipeline `${id}-${safeBranch}` and the stage
 * `${id}-${safeBranch}-Stage-${name}`, so the stage's construct id begins with
 * the owning pipeline's id followed by `-Stage-`. We match on that to pick the
 * correct branch pipeline, then read its synth ShellStep's primary input (the
 * source file set).
 *
 * Falls back to `undefined` (the hook tolerates a missing source by producing
 * no steps) if the source cannot be resolved.
 */
const resolveSource = (stage: cdk.Stage): IFileSetProducer => {
  const parent = stage.node.scope as Construct | undefined;
  if (parent) {
    for (const child of parent.node.children) {
      if (
        child instanceof CodePipeline &&
        stage.node.id.startsWith(`${child.node.id}-Stage-`)
      ) {
        const synth = child.synth;
        if (synth instanceof ShellStep && synth.inputs.length > 0) {
          return synth.inputs[0].fileSet;
        }
        return synth;
      }
    }
  }
  // Should not happen in practice; the hook returns [] when source is falsy.
  return undefined as unknown as IFileSetProducer;
};

/**
 * Append the captured `_postStageHook` steps to the built stage deployments.
 *
 * aws-blocks builds each branch's CodePipeline (adding stages via `addStage`,
 * which internally creates a Wave named after the stage) inside its
 * constructor. The pipeline remains mutable until `buildPipeline()`, so we can
 * still attach post steps here via `StageDeployment.addPost()`.
 */
const applyPostStageHook = (
  codePipelines: ReadonlyMap<string, CodePipeline>,
  postSteps: Map<string, Array<ShellStep | CodeBuildStep>>,
): void => {
  if (postSteps.size === 0) {
    return;
  }
  for (const codePipeline of codePipelines.values()) {
    for (const wave of codePipeline.waves) {
      for (const stageDeployment of wave.stages) {
        const steps = postSteps.get(stageDeployment.stageName);
        if (steps) {
          stageDeployment.addPost(...steps);
        }
      }
    }
  }
};
