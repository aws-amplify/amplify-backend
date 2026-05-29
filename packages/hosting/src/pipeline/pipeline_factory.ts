import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'node:module';
import { AmplifyPipelineConstruct } from './pipeline_construct.js';
import type { DefinePipelineProps, PipelineStageConfig } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Global key used to pass the pipeline stage scope to `defineHosting`/`defineBackend`
 * during pipeline synthesis. When set, these functions attach their constructs
 * to the pipeline stage rather than creating their own App.
 */
const AMPLIFY_PIPELINE_SCOPE_KEY = '__AMPLIFY_PIPELINE_SCOPE__';

/**
 * File extensions to search when discovering hosting.ts/backend.ts.
 */
const DISCOVERABLE_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'];

/**
 * Define a CI/CD pipeline for Amplify applications.
 *
 * Creates a self-mutating CodePipeline V2 that deploys through the configured
 * stages. Each branch gets its own independent pipeline.
 *
 * Unlike the underlying {@link AmplifyPipelineConstruct}, this user-facing factory
 * does NOT accept a `stageFactory`. Instead, it automatically discovers and imports
 * `amplify/hosting.ts` and `amplify/backend.ts` for each stage, using the ambient
 * scope pattern (`globalThis.__AMPLIFY_PIPELINE_SCOPE__`).
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
  const stackName = 'amplify-pipeline';
  const rootStack = new cdk.Stack(app, stackName, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });

  const amplifyDir = path.resolve(process.cwd(), 'amplify');
  const hostingFile = findFile(amplifyDir, 'hosting');
  const backendFile = findFile(amplifyDir, 'backend');

  const internalStageFactory = (
    scope: cdk.Stage,
    stageConfig: PipelineStageConfig,
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY] = scope;
    scope.node.setContext('AMPLIFY_STAGE_CONFIG', JSON.stringify(stageConfig));
    scope.node.setContext('AMPLIFY_STAGE_NAME', stageConfig.name);

    try {
      if (backendFile) {
        importFresh(backendFile);
      }
      if (hostingFile) {
        importFresh(hostingFile);
      }
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any)[AMPLIFY_PIPELINE_SCOPE_KEY];
    }
  };

  new AmplifyPipelineConstruct(rootStack, 'Pipeline', {
    ...props,
    stageFactory: internalStageFactory,
  });

  app.synth();
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
 * @param scope - The CDK Stage provided by the pipeline.
 * @param stageConfig - The full stage configuration for the current stage.
 * @param fn - A callback (sync or async) that imports/executes your application code.
 * @example
 * ```ts
 * definePipeline({
 *   stageFactory: async (scope, stageConfig) => {
 *     await withPipelineScope(scope, stageConfig, async () => {
 *       await import('./hosting.js');
 *     });
 *   },
 * });
 * ```
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
 * Import a module with cache-busting for CJS.
 *
 * Clears the require cache for the resolved module path before requiring,
 * ensuring each pipeline stage gets a fresh execution of hosting.ts/backend.ts.
 * Uses `require()` (not `import()`) because dynamic `import()` under tsx/esbuild
 * maintains its own ESM module map that doesn't respect `require.cache` deletion.
 */
// eslint-disable-next-line no-restricted-syntax
function importFresh(filePath: string): void {
  const resolved = require.resolve(filePath);
  delete require.cache[resolved];
  require(resolved);
}
