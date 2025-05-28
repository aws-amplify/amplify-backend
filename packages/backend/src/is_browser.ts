/**
 * Checks whether we are in a browser
 */
export const isBrowser = () => {
  return typeof globalThis.window !== 'undefined';
};
