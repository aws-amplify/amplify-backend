import { Construct } from 'constructs';
import { ConstructCache } from './construct_cache.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends Construct> = {
  getInstance(resolver: ConstructCache): Instance;
};
