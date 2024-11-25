export type RetryPredicate = (error: Error) => boolean;

/**
 * Executes an asynchronous operation with retry logic.
 * This function attempts to execute the provided callable function multiple times
 * based on the specified retry conditions. It's useful for handling transient
 * errors or temporary service unavailability.
 */
export const runWithRetry = async <T>(
  callable: (attempt: number) => Promise<T>,
  retryPredicate: RetryPredicate,
  maxAttempts = 3
): Promise<T> => {
  const collectedErrors: Error[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await callable(attempt);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        collectedErrors.push(error);
        if (!retryPredicate(error)) {
          throw error;
        }
      } else {
        // re-throw non-Error.
        // This should never happen, but we should be aware if it does.
        throw error;
      }
    }
  }

  throw new AggregateError(
    collectedErrors,
    `All ${maxAttempts} attempts failed`
  );
};

/**
 * Known retry predicates that repeat in multiple places.
 */
export class RetryPredicates {
  static createAmplifyRetryPredicate: RetryPredicate = (
    error: Error
  ): boolean => {
    const message = error.message.toLowerCase();
    // Note: we can't assert on whole stdout or stderr because
    // they're not always captured in the error due to settings we need for
    // ProcessController to work.
    const didProcessExitWithError = message.includes('exit code 1');
    const isKnownProcess =
      (message.includes('yarn add') && message.includes('aws-amplify')) ||
      message.includes('npm create amplify') ||
      message.includes('pnpm create amplify');
    return didProcessExitWithError && isKnownProcess;
  };
}
