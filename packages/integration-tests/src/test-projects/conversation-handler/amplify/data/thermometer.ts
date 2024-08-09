/**
 * Returns temperature.
 */
export const handler = async () => {
  return {
    // We use this value in test assertion.
    value: 85,
    unit: 'F',
  };
};
