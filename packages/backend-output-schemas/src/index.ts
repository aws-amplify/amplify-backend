import { z } from 'zod';
import { versionedAuthOutputSchema } from './auth/index.js';
import { versionedGraphqlOutputSchema } from './graphql/index.js';
import { versionedStorageOutputSchema } from './storage/index.js';

/**
 * The auth, graphql and storage exports here are duplicated from the submodule exports in the package.json file
 * This is because these types need to be consumed in CDK Constructs that may be JSII classes. JSII only supports
 * CommonJS modules which can't interpret submodule exports
 */

/**
 * ---------- Auth exports ----------
 */

/**
 * Expected key that auth output is stored under
 */
export const authOutputKey = 'AWS::Amplify::Auth';
export * from './auth/index.js';

/**
 * ---------- GraphQL exports ----------
 */

/**
 * Expected key that graphql output is stored under
 */
export const graphqlOutputKey = 'AWS::Amplify::GraphQL';
export * from './graphql/index.js';

/**
 * ---------- Storage exports ----------
 */

/**
 * Expected key that storage output is stored under
 */
export const storageOutputKey = 'AWS::Amplify::Storage';
export * from './storage/index.js';

/**
 * ---------- Unified exports ----------
 */

/**
 * Defines the unified expected shape of Amplify backend output.
 * As new constructs are added that need to contribute backend output, entries should be added here so that client config generation is aware of these outputs
 */
export const unifiedBackendOutputSchema = z.object({
  [authOutputKey]: versionedAuthOutputSchema.optional(),
  [graphqlOutputKey]: versionedGraphqlOutputSchema.optional(),
  [storageOutputKey]: versionedStorageOutputSchema.optional(),
});
/**
 * This type is a subset of the BackendOutput type that is exposed by the platform.
 * It represents BackendOutput that has been validated against the schema of known output values
 */
export type UnifiedBackendOutput = z.infer<typeof unifiedBackendOutputSchema>;
