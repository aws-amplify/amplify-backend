/**
 * This function takes an array and a chunk size, and returns an array of arrays,
 * where each inner array is a chunk of the original array with the specified size.
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};
