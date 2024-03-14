import { AmplifyError, AmplifyUserErrorOptions } from './amplify_error';

/**
 * Base class for all Amplify user errors
 */
export class AmplifyUserError<
  T extends string = string
> extends AmplifyError<T> {
  /**
   * Create a new Amplify Error.
   * @param name - a user friendly name for the user error
   * @param options - error stack, resolution steps, details, or help links
   * @param cause If you are throwing this error from within a catch block,
   * you must provide the error that was caught.
   * @example
   * try {
   *  ...
   * } catch (error){
   *    throw new AmplifyError(...,...,error);
   * }
   */
  constructor(name: T, options: AmplifyUserErrorOptions, cause?: Error) {
    super(name, 'ERROR', options, cause);
  }
}
