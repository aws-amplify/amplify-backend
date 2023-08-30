import fetch from 'node-fetch';

/**
 * Attempts a fetch and retries on failure
 */
export const fetchWithRetries = async (
  url: string,
  retries = 3,
  delay = 300
) => {
  let retryCount = 0;
  let retryDelay = delay;

  while (retryCount < retries) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      retryCount = retryCount + 1;
      await new Promise((res) => setTimeout(res, delay));
      retryDelay = retryDelay * 2;
    }
  }
  throw new Error('Fetch reached max number of retries without succeeding');
};
