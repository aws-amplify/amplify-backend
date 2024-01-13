import { AmplifyFault, AmplifyUserError } from '.';

/**
 * Base class for all Amplify errors or faults
 */
export abstract class AmplifyError extends Error {
  public serializedError?: string;
  public readonly message: string;
  public readonly resolution?: string;
  public readonly details?: string;
  public readonly link?: string;
  public readonly code?: string;

  /**
   * You should use AmplifyUserError or AmplifyLibraryFault to throw an error.
   * @param name - a user friendly name for the exception
   * @param classification - LibraryFault or UserError
   * @param options - error stack, resolution steps, details, or help links
   * @param cause If you are throwing this exception from within a catch block,
   * you must provide the exception that was caught.
   * @example
   * try {
   *  ...
   * } catch (error){
   *    throw new AmplifyError(...,...,error);
   * }
   */
  constructor(
    public readonly name: AmplifyErrorType,
    public readonly classification: AmplifyErrorClassification,
    private readonly options: AmplifyErrorOptions,
    public readonly cause?: Error
  ) {
    // If an AmplifyError was already thrown, we must allow it to reach the user.
    // This ensures that resolution steps, and the original error are bubbled up.
    super(options.message, { cause });

    // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, AmplifyError.prototype);

    this.message = options.message;
    this.details = options.details;
    this.resolution = options.resolution;
    this.code = options.code;
    this.link = options.link;

    if (cause && cause instanceof AmplifyError) {
      cause.serializedError = undefined;
    }
    this.serializedError = JSON.stringify({
      name,
      classification,
      options,
      cause,
    });
  }

  static fromStderr = (_stderr: string): AmplifyError | undefined => {
    const extractionRegex = /["']?serializedError["']?:[ ]?["'](.*)["']/;
    const serialized = _stderr.match(extractionRegex);
    if (serialized && serialized.length == 2) {
      try {
        const { name, classification, options, cause } = JSON.parse(
          serialized[1]
        );
        return classification === 'ERROR'
          ? new AmplifyUserError(name as AmplifyUserErrorType, options, cause)
          : new AmplifyFault(name as AmplifyLibraryFaultType, options, cause);
      } catch (error) {
        // cannot deserialize
        return undefined;
      }
    }
    return undefined;
  };

  static fromError = (error: unknown): AmplifyError => {
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'An unknown error happened. Check downstream error';

    return new AmplifyFault(
      'UnknownFault',
      {
        message: errorMessage,
      },
      error instanceof Error ? error : new Error(String(error))
    );
  };
}

/**
 * Amplify exception classifications
 */
export type AmplifyErrorClassification = 'FAULT' | 'ERROR';

/**
 * Amplify Error options object
 */
export type AmplifyErrorOptions = {
  message: string;
  details?: string;
  resolution?: string;
  link?: string;

  // CloudFormation or NodeJS error codes
  code?: string;
};

/**
 * Amplify error types
 */
export type AmplifyErrorType = AmplifyUserErrorType | AmplifyLibraryFaultType;

/**
 * Amplify error types
 */
export type AmplifyUserErrorType =
  | 'InvalidPackageJsonError'
  | 'InvalidSchemaAuthError'
  | 'InvalidSchemaError'
  | 'ExpiredTokenError'
  | 'CloudFormationDeploymentError'
  | 'CFNUpdateNotSupportedError'
  | 'SyntaxError'
  | 'BackendBuildError'
  | 'BootstrapNotDetectedError'
  | 'AccessDeniedError'
  | 'FileConventionError';

/**
 * Amplify library fault types
 */
export type AmplifyLibraryFaultType = 'UnknownFault';
