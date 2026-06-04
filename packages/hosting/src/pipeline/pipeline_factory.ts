import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'node:module';
import {
  CodeBuildStep,
  IFileSetProducer,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { AmplifyPipelineConstruct } from './pipeline_construct.js';
import type { DefinePipelineProps, PipelineStageConfig } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Global key used to pass the pipeline stage scope to `defineBackend`
 * during pipeline synthesis. When set, `defineBackend()` attaches its constructs
 * to the pipeline stage rather than creating its own App.
 */
const AMPLIFY_PIPELINE_SCOPE_KEY = '__AMPLIFY_PIPELINE_SCOPE__';

/**
 * Global key used by `defineBackend()` to publish CfnOutput references
 * back to the pipeline factory after creating the BackendStack.
 */
const BACKEND_PIPELINE_OUTPUTS_KEY = '__AMPLIFY_BACKEND_PIPELINE_OUTPUTS__';

/**
 * File extensions to search when discovering hosting.ts/backend.ts.
 * Note: .mjs is excluded because native ESM cannot be loaded via require().
 */
const DISCOVERABLE_EXTENSIONS = ['.ts', '.js', '.cjs'];

/**
 * Define a CI/CD pipeline for Amplify applications.
 *
 * Creates a self-mutating CodePipeline V2 that deploys through the configured
 * stages. Each branch gets its own independent pipeline.
 *
 * The pipeline uses a two-phase deployment per stage:
 * 1. **Backend deploy** — CloudFormation stacks (Cognito, AppSync, DynamoDB, etc.)
 *    deployed via CDK Pipelines' native stage mechanism.
 * 2. **Hosting deploy** — A post-deploy CodeBuild step that mirrors `ampx deploy`:
 *    generates `amplify_outputs.json` from the deployed backend, builds the frontend
 *    (so `amplify_outputs.json` is baked into Lambda bundles for SSR), then deploys
 *    hosting via `cdk deploy`.
 *
 * This two-phase approach ensures `amplify_outputs.json` is available during the
 * frontend build — the same ordering that `ampx deploy` provides locally.
 *
 * Use `getStageConfig()` inside `hosting.ts`/`backend.ts` to read per-stage
 * configuration during synthesis.
 * @param props - Pipeline configuration including source, synth, and branch/stage definitions.
 * @example Basic single-branch pipeline (amplify/pipeline.ts)
 * ```ts
 * import { definePipeline } from '@aws-amplify/hosting/pipeline';
 *
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
 *         { name: 'prod', requireApproval: true },
 *       ],
 *     },
 *   ],
 * });
 * ```
 * @example Per-stage config read via getStageConfig() in hosting.ts
 * ```ts
 * // amplify/hosting.ts
 * import { defineHosting, getStageConfig } from '@aws-amplify/hosting';
 *
 * const stage = getStageConfig<{ domain: string }>();
 * defineHosting({
 *   framework: 'spa',
 *   domain: stage?.config?.domain,
 * });
 * ```
 */
export const definePipeline = (props: DefinePipelineProps): void => {
  const app = new cdk.App();
  const repoSuffix = props.source.repo.replace(/[^a-zA-Z0-9]/g, '-');
  const stackName = props.stackName ?? `amplify-pipeline-${repoSuffix}`;
  const rootStack = new cdk.Stack(app, stackName, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });

  const amplifyDir = path.resolve(process.cwd(), 'amplify');
  const hostingFile = findFile(amplifyDir, 'hosting');
  const backendFile = findFile(amplifyDir, 'backend');

  if (!hostingFile && !backendFile) {
    throw new Error(
      'Could not find amplify/hosting.ts or amplify/backend.ts. ' +
        'Create at least one to define your application.',
    );
  }

  // Two-phase deployment is only needed when BOTH backend and hosting exist.
  // When both exist: backend deploys first, then a post-deploy CodeBuild step
  // generates amplify_outputs.json and deploys hosting (so the frontend build
  // has access to backend outputs — required for SSR/Next.js Lambda bundles).
  //
  // When only one exists, it's imported directly in the stageFactory.
  const useTwoPhaseDeployment = !!(backendFile && hostingFile);

  const internalStageFactory = (
    scope: cdk.Stage,
    stageConfig: PipelineStageConfig,
  ): void => {
    // Clear backend outputs from previous stage iteration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any)[BACKEND_PIPELINE_OUTPUTS_KEY];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY] = scope;
    scope.node.setContext('AMPLIFY_STAGE_CONFIG', JSON.stringify(stageConfig));
    scope.node.setContext('AMPLIFY_STAGE_NAME', stageConfig.name);

    try {
      if (backendFile) {
        importFresh(backendFile);
      }
      if (hostingFile && !useTwoPhaseDeployment) {
        // Hosting-only project (no backend) — import directly since there's
        // no backend stack to wait for before building.
        importFresh(hostingFile);
      }
      // When useTwoPhaseDeployment is true, hosting.ts is NOT imported here.
      // It is deployed by the post-deploy CodeBuild step, which runs AFTER
      // the backend CloudFormation stack is live. This ensures
      // amplify_outputs.json is available during the frontend build.
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY];
    }
  };

  // Post-stage hook: creates a CodeBuild step that deploys hosting after backend
  const postStageHook =
    useTwoPhaseDeployment && hostingFile
      ? createHostingDeployHook(hostingFile)
      : undefined;

  new AmplifyPipelineConstruct(rootStack, 'Pipeline', {
    ...props,
    stageFactory: internalStageFactory,
    _postStageHook: postStageHook,
  });

  app.synth();
};

/**
 * Create the _postStageHook that produces hosting deploy steps.
 *
 * The returned hook reads the backend CfnOutput from globalThis (set by
 * `defineBackend()` during the stageFactory call) and creates a CodeBuildStep
 * that deploys hosting after the backend stack is live.
 */
const createHostingDeployHook = (
  hostingFile: string,
): ((params: {
  source: IFileSetProducer;
  stage: cdk.Stage;
  stageConfig: PipelineStageConfig;
}) => Array<ShellStep | CodeBuildStep>) => {
  // Determine the hosting entry point relative to the project root
  const projectDir = process.cwd();
  const relativeHostingPath = path.relative(projectDir, hostingFile);

  return ({ source, stageConfig }) => {
    // Read backend CfnOutput from globalThis (set by defineBackend in pipeline mode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const backendOutputs = (globalThis as any)[BACKEND_PIPELINE_OUTPUTS_KEY] as
      | { stackNameOutput: cdk.CfnOutput; backendStack: cdk.Stack }
      | undefined;

    if (!backendOutputs?.stackNameOutput) {
      // No backend stack — skip hosting deploy step.
      // This happens when there's no backend.ts or defineBackend() wasn't called.
      return [];
    }

    const deployStep = new CodeBuildStep(`DeployHosting-${stageConfig.name}`, {
      input: source,
      envFromCfnOutputs: {
        BACKEND_STACK_NAME: backendOutputs.stackNameOutput,
      },
      env: {
        STAGE_NAME: stageConfig.name,
        HOSTING_ENTRY_POINT: relativeHostingPath,
      },
      commands: [
        // Install project dependencies
        'npm ci',

        // Install the Amplify CLI for `ampx generate outputs`.
        // The CLI package may not be in the project's dependencies
        // since it's typically a global/dev tool.
        'npm install --no-save @aws-amplify/backend-cli',

        // Generate amplify_outputs.json from the deployed backend stack.
        // This queries CloudFormation stack outputs — same as `ampx generate outputs`.
        'npx ampx generate outputs --stack $BACKEND_STACK_NAME --out-dir .',

        // Build the frontend. For SSR (Next.js), this produces Lambda bundles
        // that include amplify_outputs.json (via the adapter's
        // copyAmplifyOutputsToServerBundles).
        'npm run build',

        // Deploy hosting stack using CDK. Context flags provide the backend
        // identifier that defineHosting() reads via getBackendIdentifier().
        // This mirrors the same flow as `ampx deploy`.
        'npx cdk deploy --all --app "npx tsx $HOSTING_ENTRY_POINT" --require-approval never -c amplify-backend-namespace=pipeline -c amplify-backend-name=$STAGE_NAME -c amplify-backend-type=standalone',
      ],
      partialBuildSpec: codebuild.BuildSpec.fromObject({
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 22,
            },
          },
        },
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
        computeType: codebuild.ComputeType.MEDIUM,
      },
      rolePolicyStatements: [
        // Allow assuming CDK bootstrap roles (deploy, file-publishing, lookup)
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: ['arn:aws:iam::*:role/cdk-*'],
        }),
        // Broad read/write permissions for `ampx generate outputs` and `cdk deploy`.
        // Mirrors the scope of AWS managed policy AdministratorAccess-Amplify
        // which covers all services Amplify backends use (CloudFormation, S3,
        // Cognito, AppSync, DynamoDB, Lambda, IAM, SSM, etc.).
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudformation:*',
            's3:*',
            'amplify:*',
            'appsync:*',
            'cognito-idp:*',
            'cognito-identity:*',
            'dynamodb:*',
            'lambda:*',
            'iam:PassRole',
            'iam:CreateRole',
            'iam:AttachRolePolicy',
            'iam:PutRolePolicy',
            'iam:GetRole',
            'iam:GetRolePolicy',
            'iam:DeleteRole',
            'iam:DeleteRolePolicy',
            'iam:DetachRolePolicy',
            'ssm:GetParameter*',
            'ssm:PutParameter',
            'logs:*',
            'cloudfront:*',
            'route53:*',
            'acm:*',
          ],
          resources: ['*'],
        }),
      ],
    });

    return [deployStep];
  };
};

/**
 * Get the current pipeline stage configuration during synthesis.
 *
 * Returns the stage config when called inside a pipeline context (i.e., during
 * `stageFactory` execution). Returns `undefined` when not running inside a pipeline,
 * allowing application code to work in both standalone and pipeline modes.
 * @template T - Shape of the user-defined `config` field in stage configuration.
 * @returns The current stage configuration including `name`, or `undefined` if not in pipeline context.
 * @example
 * ```ts
 * const stageConfig = getStageConfig<{ domain: string }>();
 * if (stageConfig) {
 *   // Running inside pipeline — use stage-specific config
 *   console.log(`Deploying stage: ${stageConfig.name}`);
 *   console.log(`Domain: ${stageConfig.config?.domain}`);
 * } else {
 *   // Running standalone (e.g., `cdk synth`)
 * }
 * ```
 */
// eslint-disable-next-line no-restricted-syntax
export function getStageConfig<T = Record<string, unknown>>():
  | (PipelineStageConfig<T> & { name: string })
  | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope = (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY];
  if (!scope) return undefined;
  const raw = scope.node.tryGetContext('AMPLIFY_STAGE_CONFIG');
  return raw ? JSON.parse(raw) : undefined;
}

/**
 * Set the ambient pipeline scope and stage context, execute `fn`, then clean up.
 *
 * Use this inside your `stageFactory` to make the pipeline scope available to
 * `defineHosting`/`defineBackend` (which detect the ambient scope via `globalThis`).
 * @internal
 * @param scope - The CDK Stage provided by the pipeline.
 * @param stageConfig - The full stage configuration for the current stage.
 * @param fn - A callback (sync or async) that imports/executes your application code.
 */
// eslint-disable-next-line no-restricted-syntax
export async function withPipelineScope<T>(
  scope: cdk.Stage,
  stageConfig: PipelineStageConfig<T>,
  fn: () => Promise<void> | void,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY] = scope;
  scope.node.setContext('AMPLIFY_STAGE_CONFIG', JSON.stringify(stageConfig));
  scope.node.setContext('AMPLIFY_STAGE_NAME', stageConfig.name);
  try {
    await fn();
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY];
  }
}

/**
 * Discover a file by base name in a directory, trying known extensions.
 * @internal
 * @param dir - Directory to search in.
 * @param baseName - File base name without extension (e.g., 'hosting', 'backend').
 * @returns Resolved absolute path, or `undefined` if not found.
 */
// eslint-disable-next-line no-restricted-syntax
export function findFile(dir: string, baseName: string): string | undefined {
  for (const ext of DISCOVERABLE_EXTENSIONS) {
    const filePath = path.join(dir, baseName + ext);
    if (fs.existsSync(filePath)) return filePath;
  }
  return undefined;
}

/**
 * Patterns of module paths to bust from the require cache before each stage.
 *
 * These cover all `@aws-amplify/*` packages that hold static singleton state
 * (e.g., AmplifyAuthFactory.factoryCount, cached generators, schema singletons)
 * which would prevent re-instantiation across pipeline stages.
 *
 * Also covers the user's own `amplify/` directory files (auth/resource, data/resource, etc.)
 * which may import and configure those singletons.
 */
const CACHE_BUST_PATTERNS = [
  /@aws-amplify[/\\]/,
  /packages[/\\]backend/,
  /packages[/\\]hosting/,
  /packages[/\\]auth-construct/,
  /packages[/\\]data-schema/,
  /[/\\]amplify[/\\]/,
];

/**
 * Import a module with aggressive cache-busting for multi-stage pipelines.
 *
 * Before importing the target file, clears ALL `@aws-amplify/*` packages and
 * user amplify directory modules from the require cache. This ensures each
 * pipeline stage gets completely fresh singleton state — no static counters,
 * no cached generators, no stale schema instances.
 *
 * Without this, packages like `@aws-amplify/backend-auth` retain
 * `AmplifyAuthFactory.factoryCount` across stages, causing "already defined"
 * errors on the second stage. Users should NOT need any cache-busting
 * workarounds in their own code — the pipeline handles it here.
 */
// eslint-disable-next-line no-restricted-syntax
function importFresh(filePath: string): void {
  // Bust all Amplify-related modules from cache
  for (const key of Object.keys(require.cache)) {
    if (CACHE_BUST_PATTERNS.some((pattern) => pattern.test(key))) {
      delete require.cache[key];
    }
  }

  // Also bust the target file itself
  const resolved = require.resolve(filePath);
  delete require.cache[resolved];

  require(resolved);
}
