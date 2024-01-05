import { SSMServiceException } from '@aws-sdk/client-ssm';

/**
 * Secret Error.
 */
export class SecretError extends Error {
  public cause?: Error;
  public httpStatusCode?: number;

  /**
   * Creates a secret error instance.
   */
  constructor(
    message: string,
    options?: {
      cause?: Error;
      httpStatusCode?: number;
    }
  ) {
    super(message);
    this.name = 'SecretError';
    this.cause = options?.cause;
    this.httpStatusCode = options?.httpStatusCode;
  }

  /**
   * Creates a secret error from an underlying cause.
   */
  static createInstance = (cause: Error): SecretError => {
    if (cause instanceof SSMServiceException) {
      return SecretError.fromSSMException(cause);
    }
    return new SecretError(cause.message, { cause });
  };

  /**
   * Creates a secret error from an SSM exception.
   */
  private static fromSSMException = (
    ssmException: SSMServiceException
  ): SecretError => {
    // the SSM error message is wrong/misleading, like 'UnknownError'. We will stringify the
    // whole err object instead.
    return new SecretError(JSON.stringify(ssmException), {
      cause: ssmException,
      httpStatusCode: ssmException.$metadata.httpStatusCode,
    });
  };
}
