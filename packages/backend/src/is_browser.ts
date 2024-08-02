/**
 * simple check to determine whether we are in a browser
 */
export const isBrowser = () => {
  // @ts-expect-error we're checking for browser context and globalThis does not have an index signature
  return typeof globalThis.window !== 'undefined';
};
