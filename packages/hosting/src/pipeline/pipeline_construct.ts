// The generic CI/CD pipeline construct lives in `@aws-blocks/pipeline` (exported
// there as `Pipeline`). This module re-exports it under the historical
// `AmplifyPipelineConstruct` name.
//
// The two-phase hosting deploy (deploy backend → generate outputs → build
// frontend → deploy hosting) is expressed with `@aws-blocks/pipeline`'s public
// `postStage` prop, supplied by `definePipeline()` (see ./pipeline_factory.ts).
// `postStage` runs once per stage AFTER the stage's stacks synthesize — the
// point at which `defineBackend()` has published its `CfnOutput` — and hands the
// hook the resolved pipeline `source` plus a guarantee that a stage's `bakeTime`
// waits for the returned steps. That removed the need for this wrapper's former
// custom machinery (stageFactory-wrapping, `-Stage-` construct-id matching to
// rediscover the source, and reaching into built waves to `addPost`).
import { Pipeline } from '@aws-blocks/pipeline';
import type { Construct } from 'constructs';
import type { PipelineProps } from './types.js';

/**
 * CDK Pipelines-based CI/CD pipeline construct (L3).
 *
 * A named re-export of `@aws-blocks/pipeline`'s `Pipeline`, kept for API
 * stability. It behaves identically to the upstream construct — one
 * self-mutating CodePipeline V2 per branch, deploying to ordered stages with
 * optional approval and bake time. Per-stage post-deploy steps (e.g. the Amplify
 * hosting deploy) are supplied through the upstream `postStage` prop rather than
 * any Amplify-specific wrapping.
 * @template TConfig - Type of the user-defined `config` object passed to each stage.
 * @example
 * ```ts
 * new AmplifyPipelineConstruct(stack, 'Pipeline', {
 *   source: {
 *     repo: 'my-org/my-app',
 *     connectionArn: 'arn:aws:codeconnections:us-east-1:123456789:connection/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
 *   },
 *   branches: [{ branch: 'main', stages: [{ name: 'prod' }] }],
 *   stageFactory: (scope, stageConfig) => {
 *     new MyAppStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 */
export class AmplifyPipelineConstruct<
  TConfig = Record<string, unknown>,
> extends Pipeline<TConfig> {
  /**
   * Sync constructor. Typed against the Amplify {@link PipelineProps} (required
   * `stageFactory`, plus the internal `_sourceOverride` test hatch that
   * `@aws-blocks/pipeline` consumes at runtime but omits from its public type).
   * Delegates entirely to the upstream `Pipeline`.
   */
  constructor(scope: Construct, id: string, props: PipelineProps<TConfig>) {
    super(scope, id, props);
  }

  /**
   * Async factory (for an async `stageFactory`), typed against the Amplify
   * {@link PipelineProps}. Delegates to `Pipeline.create`.
   */
  // eslint-disable-next-line no-restricted-syntax
  static async create<TConfig = Record<string, unknown>>(
    scope: Construct,
    id: string,
    props: PipelineProps<TConfig>,
  ): Promise<Pipeline<TConfig>> {
    return Pipeline.create<TConfig>(scope, id, props);
  }
}
