import { AmplifyFault, AmplifyUserError } from '.';

/**
 * Base class for all Amplify errors or faults
 */
export abstract class AmplifyError<T extends string = string> extends Error {
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
    public readonly name: T,
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

    if (cause && AmplifyError.isAmplifyError(cause)) {
      cause.serializedError = undefined;
    }
    this.serializedError = Buffer.from(
      JSON.stringify(
        {
          name,
          classification,
          options,
          cause,
        },
        errorSerializer
      )
    ).toString('base64');
  }

  static fromStderr = (_stderr: string): AmplifyError | undefined => {
    try {
      const serializedString = tryFindSerializedErrorJSONString(_stderr);

      if (!serializedString) {
        return undefined;
      }

      const { name, classification, options, cause } =
        JSON.parse(serializedString);

      let serializedCause = cause;
      if (cause && ErrorSerializerDeserializer.isSerializedErrorType(cause)) {
        serializedCause = ErrorSerializerDeserializer.deserialize(cause);
      }
      return classification === 'ERROR'
        ? new AmplifyUserError(name, options, serializedCause)
        : new AmplifyFault(name, options, serializedCause);
    } catch (error) {
      // cannot deserialize
      return undefined;
    }
  };

  /**
   * This function is a type predicate for AmplifyError.
   * See https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates.
   *
   * Checks if error is an AmplifyError by inspecting if required properties are set.
   * This is recommended instead of instanceof operator.
   * The instance of operator does not work as expected if AmplifyError class is loaded
   * from multiple sources, for example when package manager decides to not de-duplicate dependencies.
   * See https://github.com/nodejs/node/issues/17943.
   */
  static isAmplifyError = (error: unknown): error is AmplifyError => {
    return (
      error instanceof Error &&
      'classification' in error &&
      (error.classification === 'ERROR' || error.classification === 'FAULT') &&
      typeof error.name === 'string' &&
      typeof error.message === 'string'
    );
  };

  static fromError = (error: unknown): AmplifyError => {
    if (AmplifyError.isAmplifyError(error)) {
      return error;
    }

    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'An unknown error happened. Check downstream error';

    if (error instanceof Error && isCredentialsError(error)) {
      return new AmplifyUserError(
        'CredentialsError',
        {
          message: errorMessage,
          resolution:
            'Ensure your AWS credentials are correctly set and refreshed.',
        },
        error
      );
    }
    if (error instanceof Error && isYargsValidationError(error)) {
      return new AmplifyUserError(
        'InvalidCommandInputError',
        {
          message: errorMessage,
          resolution: 'Please see the underlying error message for resolution.',
        },
        error
      );
    }
    if (error instanceof Error && isENotFoundError(error)) {
      return new AmplifyUserError(
        'DomainNotFoundError',
        {
          message: 'Unable to establish a connection to a domain',
          resolution:
            'Ensure domain name is correct and network connection is stable.',
        },
        error
      );
    }
    /**
     * catches SyntaxErrors that were somehow not instances of AmplifyError
     * this can be removed once we can properly identify where AmplifyError is being stripped off
     */
    if (error instanceof Error && isSyntaxError(error)) {
      return new AmplifyUserError(
        'SyntaxError',
        {
          message: error.message,
          resolution:
            'Check your backend definition in the `amplify` folder for syntax and type errors.',
        },
        error
      );
    }
    if (error instanceof Error && isInsufficientDiskSpaceError(error)) {
      return new AmplifyUserError(
        'InsufficientDiskSpaceError',
        {
          message: error.message,
          resolution:
            'There appears to be insufficient space on your system to finish. Clear up some disk space and try again.',
        },
        error
      );
    }
    if (error instanceof Error && isOutOfMemoryError(error)) {
      return new AmplifyUserError(
        'InsufficientMemorySpaceError',
        {
          message: error.message,
          resolution:
            'There appears to be insufficient memory on your system to finish. Close other applications or restart your system and try again.',
        },
        error
      );
    }
    return new AmplifyFault(
      'UnknownFault',
      {
        message: errorMessage,
      },
      error instanceof Error ? error : new Error(String(error))
    );
  };
}

const tryFindSerializedErrorJSONString = (
  _stderr: string
): string | undefined => {
  let errorJSONString = tryFindSerializedErrorJSONStringV2(_stderr);
  if (!errorJSONString) {
    errorJSONString = tryFindSerializedErrorJSONStringV1(_stderr);
  }
  return errorJSONString;
};

/**
 * Tries to find serialized string assuming that it is in a form of serialized JSON encoded with base64.
 */
const tryFindSerializedErrorJSONStringV2 = (
  _stderr: string
): string | undefined => {
  /**
   * `["']?serializedError["']?:[ ]?` captures the start of the serialized error. The quotes depend on which OS is being used
   * `(?:`([a-zA-Z0-9+/=]+?)`|'([a-zA-Z0-9+/=]+?)'|"([a-zA-Z0-9+/=]+?)")` captures the rest of the serialized string enclosed in either single quote,
   * double quotes or back-ticks.
   */
  const extractionRegex =
    /["']?serializedError["']?:[ ]?(?:`([a-zA-Z0-9+/=]+?)`|'([a-zA-Z0-9+/=]+?)'|"([a-zA-Z0-9+/=]+?)")/;
  const serialized = _stderr.match(extractionRegex);
  if (serialized && serialized.length === 4) {
    // 4 because 1 match and 3 capturing groups
    const base64SerializedString = serialized
      .slice(1)
      .find((item) => item && item.length > 0);
    if (base64SerializedString) {
      return Buffer.from(base64SerializedString, 'base64').toString('utf-8');
    }
  }
  return undefined;
};

/**
 * Tries to find serialized string assuming that it is in a form of serialized JSON.
 * @deprecated This is old format left for backwards compatibility in case that synth-time components are using older version of platform-core.
 */
const tryFindSerializedErrorJSONStringV1 = (
  _stderr: string
): string | undefined => {
  /**
   * `["']?serializedError["']?:[ ]?` captures the start of the serialized error. The quotes depend on which OS is being used
   * `(?:`(.+?)`|'(.+?)'|"((?:\\"|[^"])*?)")` captures the rest of the serialized string enclosed in either single quote,
   * double quotes or back-ticks.
   */
  const extractionRegex =
    /["']?serializedError["']?:[ ]?(?:`(.+?)`|'(.+?)'|"((?:\\"|[^"])*?)")/;
  const serialized = _stderr.match(extractionRegex);
  if (serialized && serialized.length === 4) {
    // 4 because 1 match and 3 capturing groups
    return serialized
      .slice(1)
      .find((item) => item && item.length > 0)
      ?.replaceAll('\\"', '"')
      .replaceAll("\\'", "'");
  }
  return undefined;
};

const isCredentialsError = (err?: Error): boolean => {
  return (
    !!err &&
    [
      'ExpiredToken',
      'ExpiredTokenException',
      'CredentialsProviderError',
      'InvalidClientTokenId',
      'CredentialsError',
    ].includes(err.name)
  );
};

// These validation messages are taken from https://github.com/yargs/yargs/blob/0c95f9c79e1810cf9c8964fbf7d139009412f7e7/lib/validation.ts
const isYargsValidationError = (err?: Error): boolean => {
  return (
    !!err &&
    ([
      'Unknown command',
      'Unknown argument',
      'Did you mean',
      'Not enough non-option arguments',
      'Too many non-option arguments',
      'Missing required argument',
      'Invalid values:',
      'Missing dependent arguments',
      'Implications failed',
    ].some((message) => err.message.startsWith(message)) ||
      err.message.endsWith('are mutually exclusive'))
  );
};

const isENotFoundError = (err?: Error): boolean => {
  return !!err && err.message.includes('getaddrinfo ENOTFOUND');
};

const isSyntaxError = (err?: Error): boolean => {
  return !!err && err.name === 'SyntaxError';
};

const isInsufficientDiskSpaceError = (err?: Error): boolean => {
  return (
    !!err &&
    ['ENOSPC: no space left on device', 'code ENOSPC'].some((message) =>
      err.message.includes(message)
    )
  );
};

const isOutOfMemoryError = (err?: Error): boolean => {
  return !!err && err.message.includes('process out of memory');
};

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
 * Same as AmplifyErrorOptions except resolution is required
 */
export type AmplifyUserErrorOptions = Omit<
  AmplifyErrorOptions,
  'resolution'
> & { resolution: string };

const errorSerializer = (_: unknown, value: unknown) => {
  if (value instanceof Error) {
    return ErrorSerializerDeserializer.serialize(value);
  }
  return value;
};
class ErrorSerializerDeserializer {
  static serialize = (error: Error) => {
    const serializedError: SerializedErrorType = {
      name: error.name,
      message: error.message,
    };
    return serializedError;
  };

  static deserialize = (deserialized: SerializedErrorType) => {
    const error = new Error(deserialized.message);
    error.name = deserialized.name;
    return error;
  };

  static isSerializedErrorType = (obj: unknown): obj is SerializedErrorType => {
    if (
      obj &&
      (obj as SerializedErrorType).name &&
      (obj as SerializedErrorType).message
    )
      return true;
    return false;
  };
}
type SerializedErrorType = {
  name: string;
  message: string;
};
