/**
 * Represents validation errors.
 */
export class ValidationError extends Error {
  /**
   * Creates validation error instance.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
