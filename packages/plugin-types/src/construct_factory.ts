import { ConstructCache } from './construct_cache.js';
import { AmplifyConstruct } from './amplify_construct.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends AmplifyConstruct> = {
  getInstance(resolver: ConstructCache): Instance;
};
