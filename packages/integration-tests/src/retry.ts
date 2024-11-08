/**
 * Executes an asynchronous operation with retry logic.
 * This function attempts to execute the provided callable function multiple times
 * based on the specified retry conditions. It's useful for handling transient
 * errors or temporary service unavailability.
 */
export const runWithRetry = async <T>(
  callable: () => Promise<T>,
  retryPredicate: (error: Error) => boolean,
  maxAttempts = 3,
  timeout?: number
): Promise<T> => {
  const startTime = Date.now();
  const collectedErrors: Error[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (timeout && Date.now() - startTime >= timeout) {
        throw new Error(`Operation timed out after ${timeout}ms`);
      }

      const result = await callable();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        collectedErrors.push(error);

        if (!retryPredicate(error) || attempt === maxAttempts) {
          break;
        }

        console.log(`Attempt ${attempt} failed. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay between retries
      } else {
        throw error; // Re-throw if it's not an Error object
      }
    }
  }

  throw new AggregateError(
    collectedErrors,
    `All ${maxAttempts} attempts failed`
  );
};
