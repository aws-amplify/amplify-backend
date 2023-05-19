import { ConstructInitializer } from './construct_initializer.js';
import { Construct } from 'constructs';

/**
 * Vends Constructs based on an initializer function
 */
export type ConstructCache = {
  getOrCompute(initializer: ConstructInitializer<Construct>): Construct;
};
