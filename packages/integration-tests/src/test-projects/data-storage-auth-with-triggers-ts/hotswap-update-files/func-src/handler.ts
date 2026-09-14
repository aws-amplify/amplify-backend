// we have to use ts-ignore instead of ts-expect-error because when the tsc check as part of the deployment runs, there will no longer be an error
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Ignoring TS here because this code will be hotswapped in for the original handler code. The destination location contains the response_generator dependency
import { getResponse } from './response_generator.js';

/**
 * Non-functional change to the lambda but it triggers a sandbox hotswap
 */
export const handler = () => getResponse();
