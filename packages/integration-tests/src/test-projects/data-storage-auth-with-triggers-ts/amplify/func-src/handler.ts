import { getResponse } from './response_generator.js';
import { Amplify } from 'aws-amplify';

// ensure that the Amplify client is importable/configurable
Amplify.configure({});

/**
 * Dummy lambda handler to test building a function with a local import
 */
export const handler = async () => getResponse();
