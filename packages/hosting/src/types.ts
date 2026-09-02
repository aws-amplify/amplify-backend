// The public hosting type contract (`FrameworkType`, `HostingResources`) lives
// in `@aws-blocks/hosting/constructs`. Re-exported here so the local glue
// (factory.ts) and the package's public API keep importing it from `./types.js`
// while the definitions are owned by aws-blocks.
//
// As of `@aws-blocks/hosting` 0.2.0 the package `.` entry is the CDK-free value
// API (`secret`/`config`); the hosting/manifest types moved to the `./constructs`
// entry.
import type {
  HostingProps as BlocksHostingProps,
  EnvValue,
  KindStoreOptions,
} from '@aws-blocks/hosting/constructs';

export type { FrameworkType, HostingResources } from '@aws-blocks/hosting/constructs';

// Re-export the marker/store types so consumers can reference them directly
// (e.g. when typing their own `environment` maps).
export type { EnvValue, KindStoreOptions } from '@aws-blocks/hosting/constructs';

/**
 * Configuration for `defineHosting()`.
 *
 * Amplify widens the upstream `@aws-blocks/hosting` `HostingProps` in two ways so
 * self-managed hosting can reference externalized values:
 *
 * - **`environment`** accepts `secret('KEY')` / `config('KEY')` markers (and BYO
 *   `ISecret` / `IParameter` handles) in addition to plain strings. A marker
 *   injects only the store *locator* into the compute Lambdas (never the value)
 *   and grants least-privilege read + decrypt; the value is read at runtime with
 *   `getSecret('KEY')` / `getConfig('KEY')`.
 * - **`secretStore` / `configStore`** override the per-kind SSM/Secrets Manager
 *   namespace. When omitted, `defineHosting` defaults them to a per-project path
 *   (`/amplify/hosting/<project>/secrets` and `/amplify/hosting/<project>/config`)
 *   so the CLI write, the IAM grant, and the runtime read all agree.
 */
export type HostingProps = Omit<BlocksHostingProps, 'environment'> & {
  /**
   * Environment variables injected into all compute (SSR) Lambda functions.
   *
   * Accepts:
   * - a plain string — appears in plaintext in the template; use only for
   *   non-sensitive literals (feature flags, region, service names);
   * - `secret('KEY')` — a sensitive value in AWS Secrets Manager, read at
   *   runtime with `getSecret('KEY')`;
   * - `config('KEY')` — a non-sensitive value in SSM Parameter Store, read at
   *   runtime with `getConfig('KEY')`;
   * - a BYO `ISecret` / `IParameter` CDK handle to an existing store entry.
   *
   * For the marker forms only the store locator is injected; the value never
   * enters the CloudFormation template.
   * @example
   * ```ts
   * import { defineHosting, secret, config } from '@aws-amplify/hosting';
   * defineHosting({
   *   environment: {
   *     APP_REGION: 'us-east-1',            // non-sensitive literal
   *     STRIPE_KEY: secret('STRIPE_KEY'),   // → getSecret('STRIPE_KEY')
   *     FEATURE_FLAGS: config('FEATURE_FLAGS'), // → getConfig('FEATURE_FLAGS')
   *   },
   * });
   * ```
   */
  environment?: Record<string, EnvValue>;

  /**
   * Namespace/cache options for `secret()` values (AWS Secrets Manager).
   * Defaults to `{ prefix: '/amplify/hosting/<project>/secrets' }`.
   */
  secretStore?: KindStoreOptions;

  /**
   * Namespace/cache options for `config()` values (SSM Parameter Store).
   * Defaults to `{ prefix: '/amplify/hosting/<project>/config' }`.
   */
  configStore?: KindStoreOptions;
};
