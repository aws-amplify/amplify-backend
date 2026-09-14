// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';

/**
 * User-agent token attributing these calls to Amplify, mirroring the
 * `amplify-ai-constructs` precedent. Compliant with
 * https://www.rfc-editor.org/rfc/rfc5234.
 */
const packageName = 'amplify-backend-notifications';

// Reading this package's own version has to satisfy TWO different execution
// environments, so both are handled explicitly:
//
// 1. The esbuild CJS bundle that actually runs in Lambda. `require` exists, and
//    esbuild statically follows the call and INLINES package.json into the
//    bundle — the same trick ai-constructs' user_agent_provider.ts relies on.
//    The file is never read from disk at runtime (it is not shipped with the
//    asset), which is precisely why the require form is needed.
// 2. Plain ESM (the compiled `lib/` output this package publishes, which is also
//    what the unit tests execute). Unlike ai-constructs this package is
//    `"type": "module"`, so `require` is NOT defined and referencing it would
//    throw at module load; the version is read from disk relative to this
//    module instead.
//
// `package.json` deliberately is not imported statically: it sits outside the
// tsconfig `rootDir`, so an import would need the tsconfig layout to be broken
// apart (see https://stackoverflow.com/questions/55753163) and would break the
// repo's tsconfig-correctness checks. Nor is a literal version string an option,
// as it would silently drift from the published one.
const readPackageVersion = (): string => {
  if (typeof require === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../../package.json').version;
  }
  return JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'),
  ).version;
};

const packageVersion: string = readPackageVersion();

/**
 * Shared configuration for every AWS SDK v3 client constructed by this
 * package's Lambda handlers. Tags each request with a custom user-agent
 * (`amplify-backend-notifications#<version>`) so the calls this integration
 * makes are attributable to Amplify by the AWS service teams that receive them.
 *
 * Pass it to the client constructor, spreading it alongside any
 * client-specific config rather than replacing it:
 * ```ts
 * const ddb = new DynamoDBClient(awsClientConfig());
 * const other = new DynamoDBClient({ ...awsClientConfig(), region: 'us-east-1' });
 * ```
 */
export const awsClientConfig = (): {
  customUserAgent: Array<[string, string]>;
} => ({
  customUserAgent: [[packageName, packageVersion]],
});
