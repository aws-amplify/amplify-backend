import { getResponse } from './response_generator.js';

// node 16 does not include fetch, so we need to polyfill it
// once lambda sunsets node 16 we can remove this dev dependency
import fetch from 'node-fetch';
global.fetch = fetch as never;

/**
 * Dummy lambda handler to test building a function with a local import
 */
export const handler = async () => getResponse();
