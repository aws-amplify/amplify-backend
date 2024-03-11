// @ts-expect-error Ignoring TS here because this code will be hotswapped in for the original handler code. The destination location contains the response_generator dependency
import { getResponse } from './response_generator.js';

/**
 * Non-functional change to the lambda but it triggers a sandbox hotswap
 */
export const handler = () => getResponse();
