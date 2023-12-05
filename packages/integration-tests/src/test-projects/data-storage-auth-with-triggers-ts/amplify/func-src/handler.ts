import { getResponse } from './response_generator.js';

/**
 * Dummy lambda handler to test building a function with a local import
 */
export const handler = async () => getResponse();
