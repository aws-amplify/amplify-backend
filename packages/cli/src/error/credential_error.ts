/**
 * The invalid credential error.
 */
export class InvalidCredentialError extends Error {
  /**
   * Creates a credential error instance.
   */
  constructor(
    message: string,
    options?: {
      cause?: unknown;
    }
  ) {
    super(message, {
      cause: options?.cause,
    });
  }
}
