/**
 * Attempts a fetch and retries on failure
 */
export const retry = async <T>(
  executor: () => Promise<T>,
  retries = 3,
  delay = 300
) => {
  for (let retryCount = 0; retryCount < retries; retryCount += 1) {
    try {
      const result = await executor();
      return result;
    } catch (error) {
      const retryDelay = delay * 2 ** retryCount;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  throw new Error('Fetch reached max number of retries without succeeding');
};
