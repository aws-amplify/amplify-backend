import { Construct } from 'constructs';
import { ConstructResolver } from './backend_build_state.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends Construct> = {
  getInstance(resolver: ConstructResolver): Instance;
};
