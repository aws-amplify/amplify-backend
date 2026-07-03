// The generic pipeline configuration types now live in `@aws-blocks/pipeline`.
// This module re-exports them so `@aws-amplify/hosting/pipeline` keeps its
// public API, while adding the Amplify-specific props (`DefinePipelineProps`,
// the internal `_postStageHook`, and `stackName`) that the shim owns.
//
// See ./pipeline_construct.ts for the thin `AmplifyPipelineConstruct` wrapper
// and ./pipeline_factory.ts for `definePipeline()` — the two pieces of
// Amplify-specific glue that are NOT delegated to aws-blocks.
import type * as cdk from 'aws-cdk-lib';
import type {
  CodeBuildStep,
  CodePipelineSource,
  IFileSetProducer,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import type {
  BranchConfig,
  PipelineProps as BlocksPipelineProps,
  PipelineStageConfig,
  PipelineSourceConfig,
  PipelineSynthConfig,
} from '@aws-blocks/pipeline';

// Re-export the shared config types unchanged. These are the same objects the
// upstream package defines; consumers importing them from
// `@aws-amplify/hosting/pipeline` get the exact aws-blocks types.
export type {
  BranchConfig,
  PipelineSourceConfig,
  PipelineStageConfig,
  PipelineSynthConfig,
} from '@aws-blocks/pipeline';

/**
 * User-facing props for `definePipeline()`.
 *
 * Unlike the internal {@link PipelineProps}, this type does NOT expose
 * `stageFactory` — `definePipeline()` automatically discovers and imports
 * `amplify/hosting.ts` and `amplify/backend.ts` for each stage using the
 * ambient scope pattern (`globalThis.__AMPLIFY_PIPELINE_SCOPE__`).
 *
 * This is Amplify-specific glue and has no equivalent in `@aws-blocks/pipeline`.
 * @template TConfig - Type of user-defined per-stage configuration.
 * @example
 * ```ts
 * // amplify/pipeline.ts
 * definePipeline({
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
 * });
 * ```
 */
export type DefinePipelineProps<TConfig = Record<string, unknown>> = {
  /** Source repository configuration. */
  readonly source: PipelineSourceConfig;

  /** Synth step configuration. */
  readonly synth?: PipelineSynthConfig;

  /**
   * Branch configurations. Each entry creates a separate CodePipeline.
   */
  readonly branches: Array<BranchConfig<TConfig>>;

  /**
   * Whether the pipeline should self-mutate (update its own definition).
   * @default true
   */
  readonly selfMutation?: boolean;

  /**
   * Cross-account keys for artifact encryption.
   * Enable when deploying to accounts different from the pipeline account.
   * @default false
   */
  readonly crossAccountKeys?: boolean;

  /**
   * Optional CloudFormation stack name for the pipeline stack.
   *
   * When omitted, defaults to `amplify-pipeline-<sanitized-repo-name>`.
   * Provide an explicit name if you need a stable stack name or have
   * multiple pipelines for the same repository in one account/region.
   * @example 'my-app-pipeline'
   */
  readonly stackName?: string;
};

/**
 * Internal props for the {@link AmplifyPipelineConstruct}.
 *
 * Extends the generic `@aws-blocks/pipeline` props with the Amplify-specific
 * `_postStageHook`, which `definePipeline()` uses to append the two-phase
 * hosting deploy step after each backend stage. Everything else — source,
 * synth, branches, `stageFactory`, `selfMutation`, `crossAccountKeys`,
 * `_sourceOverride` — is delegated to aws-blocks unchanged.
 *
 * `stageFactory` is narrowed to required here (aws-blocks makes it optional
 * because it also supports the `appFile` path, which the Amplify shim does not
 * use).
 * @template TConfig - Type of user-defined per-stage configuration.
 * @example
 * ```ts
 * new AmplifyPipelineConstruct(stack, 'Pipeline', {
 *   source: { repo: 'my-org/my-app', connectionArn: '...' },
 *   branches: [{ branch: 'main', stages: [{ name: 'prod' }] }],
 *   stageFactory: (scope, stageConfig) => {
 *     new MyStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 */
export type PipelineProps<TConfig = Record<string, unknown>> =
  BlocksPipelineProps<TConfig> & {
    /**
     * Factory function that populates a CDK Stage with stacks.
     *
     * Required in the Amplify wrapper (aws-blocks marks it optional to allow
     * its `appFile` path, which the shim does not expose).
     */
    readonly stageFactory: (
      scope: cdk.Stage,
      stageConfig: PipelineStageConfig<TConfig>,
    ) => void | Promise<void>;

    /**
     * Internal escape hatch: override the GitHub source with a custom source.
     *
     * Used in tests to provide an S3 source instead of requiring a real GitHub
     * connection. `@aws-blocks/pipeline` consumes this at runtime but (as of
     * 0.1.1) omits it from its public `PipelineProps` type, so the shim
     * re-declares it here to keep it type-visible. Not part of the public API.
     * @internal
     */
    readonly _sourceOverride?: CodePipelineSource;

    /**
     * Internal hook called after each stage's stageFactory runs.
     *
     * Returns additional post-deploy steps to append to the stage. Used by
     * `definePipeline()` to add the hosting deployment CodeBuild step after the
     * backend stage deploys. Has no equivalent in `@aws-blocks/pipeline`; the
     * wrapper reinjects the returned steps via `StageDeployment.addPost()`.
     * @internal
     */
    readonly _postStageHook?: (params: {
      source: IFileSetProducer;
      stage: cdk.Stage;
      stageConfig: PipelineStageConfig<TConfig>;
    }) => Array<ShellStep | CodeBuildStep>;
  };
