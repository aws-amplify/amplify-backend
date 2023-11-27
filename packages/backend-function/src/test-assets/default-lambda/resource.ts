import { defineFunction } from '../../factory.js';

/**
 * Because the defineFunction() defaults depend on a specific file convention,
 * we are defining a test asset here where the directory structure can be controlled
 */
export const defaultLambda = defineFunction();
