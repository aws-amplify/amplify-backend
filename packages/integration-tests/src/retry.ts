/**
 * Executes an asynchronous operation with retry logic.
 * This function attempts to execute the provided callable function multiple times
 * based on the specified retry conditions. It's useful for handling transient
 * errors or temporary service unavailability.
 */
export const runWithRetry = async <T>(
  callable: () => Promise<T>,
  retryPredicate: (error: Error) => boolean,
  maxAttempts = 3
): Promise<T> => {
  const collectedErrors: Error[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await callable();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        collectedErrors.push(error);

        if (!retryPredicate(error) || attempt === maxAttempts) {
          break;
        }
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
