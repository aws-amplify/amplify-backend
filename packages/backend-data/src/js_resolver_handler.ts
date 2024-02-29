/**
 * Pipeline resolver request handler
 */
export const request = (): unknown => {
  return {};
};
/**
 * Pipeline resolver response handler
 */
export const response = (ctx: Record<string, Record<string, string>>) => {
  return ctx.prev.result;
};
