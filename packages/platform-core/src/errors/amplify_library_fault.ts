import {
  AmplifyError,
  AmplifyErrorOptions,
  AmplifyLibraryFaultType,
} from './amplify_error';

/**
 * Base class for all Amplify library faults
 */
export class AmplifyFault extends AmplifyError {
  /**
   * Create a new Amplify Library Fault
   * @param name - a user friendly name for the exception
   * @param options - error stack, resolution steps, details, or help links
   * @param cause If you are throwing this exception from within a catch block,
   * you must provide the exception that was caught.
   * @example
   * try {
   *  ...
   * } catch (error){
   *    throw new AmplifyLibraryFault(error,...,...);
   * }
   */
  constructor(
    name: AmplifyLibraryFaultType,
    options: AmplifyErrorOptions,
    cause?: Error
  ) {
    super(name, 'FAULT', options, cause);
  }
}
