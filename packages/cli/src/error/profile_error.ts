/**
 * The aws profile error.
 */
export class ProfileError extends Error {
  /**
   * Creates a profile error instance.
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
