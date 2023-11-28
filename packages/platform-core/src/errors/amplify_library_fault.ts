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
   * @param downstreamError If you are throwing this exception from within a catch block,
   * you must provide the exception that was caught.
   * @example
   * try {
   *  ...
   * } catch (downstreamError){
   *    throw new AmplifyLibraryFault(downstreamError,...,...);
   * }
   */
  constructor(
    name: AmplifyLibraryFaultType,
    options: AmplifyErrorOptions,
    downstreamError?: Error
  ) {
    super(name, 'FAULT', options, downstreamError);
  }
}
