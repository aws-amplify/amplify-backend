import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';

/**
 * Configuration for the pipeline source (GitHub/CodeConnections).
 *
 * Uses AWS CodeConnections (formerly CodeStar Connections) for OAuth-based
 * access to GitHub repositories. No token management required — the
 * connection is created once via the AWS Console.
 */
export type PipelineSourceConfig = {
  /**
   * Repository in `owner/repo` format.
   * @example 'my-org/my-app'
   */
  readonly repo: string;

  /**
   * ARN of the AWS CodeConnections connection.
   *
   * **Important:** This connection requires a one-time OAuth handshake via the
   * AWS Console before it can be used. After creating the connection resource
   * (via CDK, CLI, or Console), you must complete the OAuth flow in the
   * Console under **Developer Tools → Connections** — the connection will be
   * in `PENDING` status until authorized.
   *
   * Steps:
   * 1. Create the connection (Console or CLI)
   * 2. Navigate to **Developer Tools → Connections** in the AWS Console
   * 3. Select the pending connection and click "Update pending connection"
   * 4. Authorize the GitHub app and select your repository/organization
   * 5. The status changes to `AVAILABLE` — the pipeline can now pull source
   * @see https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html
   * @example 'arn:aws:codeconnections:us-east-1:123456789:connection/abc-def'
   */
  readonly connectionArn: string;

  /**
   * Whether to trigger the pipeline on push to the branch.
   * @default true
   */
  readonly triggerOnPush?: boolean;

  /**
   * Path-based trigger filters for monorepo support.
   *
   * When specified, the pipeline only triggers on pushes that modify files
   * matching these path patterns. Useful for monorepos where multiple
   * pipelines share a single repository.
   * @example ['packages/backend/**', 'shared/**']
   */
  readonly triggerFilters?: string[];
};

/**
 * Configuration for the synth step (build + CDK synth).
 *
 * The synth step installs dependencies and runs `cdk synth` to produce
 * the CloudFormation template. The pipeline is self-mutating: if the
 * synth output changes the pipeline definition, it updates itself first.
 */
export type PipelineSynthConfig = {
  /**
   * Shell commands to run during the synth step.
   * @default ['npm ci', 'npx cdk synth'] — installs dependencies and synthesizes the CDK app.
   * Override if you need Node version upgrades, custom build steps, or a non-standard cdk.json app path.
   */
  readonly commands?: string[];

  /**
   * Commands to run in the CodeBuild install phase (before synth commands).
   * @default [] — no install commands. The default build image (Amazon Linux 2023 standard:5.0)
   * includes Node 22. Set this if you need additional global tools or a different Node version.
   * @example ['n 20'] — downgrade Node to version 20
   */
  readonly installCommands?: string[];

  /**
   * The CodeBuild build image to use for the synth step.
   *
   * The default image (Amazon Linux 2023 standard:5.0) includes Node 22.
   * Override this if you need a different OS or runtime set.
   * @default codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5
   */
  readonly buildImage?: codebuild.IBuildImage;

  /**
   * Environment variables available during synth.
   */
  readonly env?: Record<string, string>;

  /**
   * Primary output directory for the CDK cloud assembly.
   *
   * Override this for monorepos where `cdk synth` outputs to a
   * subdirectory (e.g., `packages/infra/cdk.out`).
   * @default 'cdk.out'
   */
  readonly primaryOutputDirectory?: string;

  /**
   * Whether to enable Docker for the synth step.
   *
   * Required when your CDK app uses Docker image assets (e.g., Lambda
   * container images, ECS task definitions with Dockerfile builds).
   * @default false
   */
  readonly dockerEnabled?: boolean;

  /**
   * CodeBuild compute type for the synth step.
   *
   * Controls the CPU/memory allocation for the build environment.
   * Increase this if you encounter OOM (exit code 137) during synth/bundling.
   *
   * - `SMALL`: 2 vCPU, 3 GB
   * - `MEDIUM`: 4 vCPU, 7 GB
   * - `LARGE`: 8 vCPU, 15 GB
   * @default ComputeType.MEDIUM (7GB RAM, 4 vCPU) — sufficient for most apps with
   * Lambda bundling + frontend builds. Use SMALL for trivial apps or LARGE for monorepos.
   */
  readonly computeType?: codebuild.ComputeType;
};

/**
 * Configuration for a deployment stage.
 *
 * Each stage represents a deployment environment (e.g., beta, prod).
 * Stages are deployed in the order they appear in the `stages` array.
 */
export type PipelineStageConfig<TConfig = Record<string, unknown>> = {
  /**
   * Logical name for this stage (e.g., 'beta', 'prod').
   * Used as the CDK Stage construct id.
   */
  readonly name: string;

  /**
   * Target AWS account and region for this stage.
   * When omitted, deploys to the pipeline's own account/region.
   */
  readonly env?: cdk.Environment;

  /**
   * Whether to require manual approval before deploying to this stage.
   * @default false
   */
  readonly requireApproval?: boolean;

  /**
   * Optional comment shown in the approval notification.
   * Only relevant when `requireApproval` is true.
   */
  readonly approvalComment?: string;

  /**
   * Optional baking time after deployment before proceeding.
   * Useful for canary validation — gives time for alarms to fire.
   *
   * Implemented as a CodeBuild `sleep` step (~$0.005/min on
   * `BUILD_GENERAL1_SMALL`). The maximum practical value is **55 minutes**
   * because CodeBuild's default build timeout is 60 minutes; exceeding
   * this causes the step to fail.
   *
   * For longer baking periods, use `requireApproval: true` with
   * external monitoring/alerting instead.
   */
  readonly bakeTime?: cdk.Duration;

  /**
   * User-defined configuration passed through to the stage.
   *
   * Use this for per-stage settings like domain names, feature flags,
   * scaling parameters, etc.
   * @example { domain: 'myapp.com', enableCanary: true }
   */
  readonly config?: TConfig;

  /**
   * Environment variables to set on `process.env` during synthesis for this stage.
   *
   * These are synthesis-time variables (available during `cdk synth`), not deployment-time.
   * Use this for per-stage configuration that your CDK app reads from `process.env`
   * (e.g., domain names, feature flags).
   * @example { DOMAIN: 'myapp.com', ENABLE_CANARY: 'true' }
   */
  readonly environment?: Record<string, string>;
};

/**
 * Configuration for a single branch pipeline.
 *
 * Each branch entry creates its own independent CodePipeline that triggers
 * on pushes to the specified branch and deploys through its own ordered stages.
 */
export type BranchConfig<TConfig = Record<string, unknown>> = {
  /**
   * Git branch that triggers this pipeline.
   * @example 'main'
   */
  readonly branch: string;

  /**
   * Ordered list of deployment stages for this branch's pipeline.
   */
  readonly stages: Array<PipelineStageConfig<TConfig>>;

  /**
   * Whether to trigger this branch's pipeline on push.
   *
   * Overrides the top-level `source.triggerOnPush` for this specific branch.
   * Useful when you want most branches to auto-trigger but disable it for
   * specific branches (e.g., a release branch that deploys on manual trigger only).
   * @default inherits from source.triggerOnPush (which defaults to true)
   */
  readonly triggerOnPush?: boolean;
};

/**
 * User-facing props for `definePipeline()`.
 *
 * Unlike the internal {@link PipelineProps}, this type does NOT expose
 * `stageFactory` — `definePipeline()` automatically discovers and imports
 * `amplify/hosting.ts` and `amplify/backend.ts` for each stage using the
 * ambient scope pattern (`globalThis.__AMPLIFY_PIPELINE_SCOPE__`).
 * @template TConfig - Type of user-defined per-stage configuration.
 * @example
 * ```ts
 * // amplify/pipeline.ts
 * definePipeline({
 *   source: {
 *     repo: 'my-org/my-app',
 *     connectionArn: 'arn:aws:codeconnections:us-east-1:123456789:connection/abc',
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
};

/**
 * Internal props for the {@link AmplifyPipelineConstruct}.
 *
 * Extends {@link DefinePipelineProps} with `stageFactory` and internal overrides.
 * This is the framework-agnostic L3 construct API — consumers who want full
 * control (e.g., wrapping the construct in a different framework) use this directly.
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
export type PipelineProps<TConfig = Record<string, unknown>> = {
  /** Source repository configuration. */
  readonly source: PipelineSourceConfig;

  /** Synth step configuration. */
  readonly synth?: PipelineSynthConfig;

  /**
   * Branch configurations. Each entry creates a separate CodePipeline.
   *
   * A single source repository can have multiple branch pipelines, each
   * with its own set of deployment stages and configuration.
   */
  readonly branches: Array<BranchConfig<TConfig>>;

  /**
   * Factory function that populates a CDK Stage with stacks.
   *
   * Called once per stage across all branches. The factory receives the Stage
   * scope and the full stage configuration object (including `name`, `env`,
   * and any user-defined `config`).
   *
   * May be async when using constructs that require async initialization.
   * @param scope - The CDK Stage construct to add stacks to.
   * @param stageConfig - The full stage configuration including name, env, and user-defined config.
   */
  readonly stageFactory: (
    scope: cdk.Stage,
    stageConfig: PipelineStageConfig<TConfig>,
  ) => void | Promise<void>;

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
   * Internal escape hatch: override the GitHub source with a custom source.
   *
   * Used in e2e tests to provide an S3 source instead of requiring a real
   * GitHub connection. Not part of the public API.
   * @internal
   */
  readonly _sourceOverride?: CodePipelineSource;
};
