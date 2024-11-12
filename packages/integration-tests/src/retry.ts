export type RetryPredicate = (error: Error) => boolean;

/**
 * Executes an asynchronous operation with retry logic.
 * This function attempts to execute the provided callable function multiple times
 * based on the specified retry conditions. It's useful for handling transient
 * errors or temporary service unavailability.
 */
export const runWithRetry = async <T>(
  callable: () => Promise<T>,
  retryPredicate: RetryPredicate,
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
    const knowProcessExitedWithError =
      message.includes('exit code 1') &&
      (message.includes('yarn add') ||
        message.includes('npm create amplify') ||
        message.includes('pnpm create amplify'));
    const isKnownError =
      // Registries may return 404 right after transitive dependency release
      // when their CDN cache is getting eventually consistent with new version.
      // I.e. Package manager may resolve brand new latest version but subsequent attempt to
      // get package payload gives 404
      message.includes('package not found') ||
      message.includes('404') ||
      // Retry on random connection instabilities.
      message.includes('ECONNRESET');
    return knowProcessExitedWithError && isKnownError;
  };
}
