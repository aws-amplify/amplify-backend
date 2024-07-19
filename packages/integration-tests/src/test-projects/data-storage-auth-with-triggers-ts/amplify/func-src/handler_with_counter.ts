/**
 * This function asserts that schedule functions are working properly
 */
let numInvocations = 0;
export const handler = async () => {
  numInvocations++;

  return numInvocations;
};
