/**
 * Pipeline resolver request handler
 */
export const request = (ctx: Record<string, Record<string, string>>) => {
  ctx.stash.awsAppsyncApiId = '${amplifyApiId}';
  ctx.stash.amplifyBranchName = '${amplifyEnvironmentName}';
  return {};
};
/**
 * Pipeline resolver response handler
 */
export const response = (ctx: Record<string, Record<string, string>>) => {
  return ctx.prev.result;
};
