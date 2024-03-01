/**
 * Pipeline resolver request handler
 */
export const request = () => {
  return {};
};
/**
 * Pipeline resolver response handler
 */
export const response = (ctx: Record<string, Record<string, string>>) => {
  return ctx.prev.result;
};
