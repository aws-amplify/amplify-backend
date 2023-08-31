import fetch from 'node-fetch';

/**
 * Attempts a fetch and retries on failure
 */
export const fetchWithRetries = async (
  url: string,
  retries = 3,
  delay = 300
) => {
  for (let retryCount = 0; retryCount < retries; retryCount += 1) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      const retryDelay = delay * 2 ** retryCount;
      await new Promise((res) => setTimeout(res, retryDelay));
    }
  }
  throw new Error('Fetch reached max number of retries without succeeding');
};
