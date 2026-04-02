/**
 * User-facing error with structured message and resolution guidance.
 * Replaces AmplifyUserError for standalone construct usage.
 *
 * Constructor signature matches AmplifyUserError so the replacement is mechanical:
 *   new AmplifyUserError('Code', { message, resolution }, cause?)
 *   new HostingError('Code', { message, resolution }, cause?)
 */
export class HostingError extends Error {
  public readonly resolution: string;

  /**
   * Create a new HostingError with a code, message, resolution, and optional cause.
   */
  constructor(
    public readonly code: string,
    opts: { message: string; resolution: string },
    cause?: Error,
  ) {
    super(opts.message);
    this.name = code;
    this.resolution = opts.resolution;
    if (cause) {
      this.cause = cause;
    }
  }
}
