/**
 * This function asserts that schedule functions are working properly
 */
export const handler = async () => {
  let numInvocations = process.env.NUM_INVOCATIONS
    ? Number(process.env.NUM_INVOCATIONS)
    : 100;
  numInvocations++;
  process.env.NUM_INVOCATIONS = numInvocations.toString();

  return numInvocations;
};
