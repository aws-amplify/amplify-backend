import { ConstructCache } from './construct_cache.js';
import { Construct } from 'constructs';
import { AmplifyBackendPlatform } from './amplify_backend_platform.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends Construct> = {
  getInstance(
    resolver: ConstructCache,
    backendPlatform: AmplifyBackendPlatform
  ): Instance;
};
