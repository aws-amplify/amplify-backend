import { SSMServiceException } from '@aws-sdk/client-ssm';

export type SecretErrorCause = SSMServiceException | undefined;

/**
 * Secret Error.
 */
export class SecretError extends Error {
  public cause: SecretErrorCause;
  public httpStatusCode: number | undefined;

  /**
   * Creates a secret error instance.
   */
  constructor(
    message: string,
    options?: {
      cause?: SecretErrorCause;
      httpStatusCode?: number;
    }
  ) {
    super(message);
    this.name = 'SecretError';
    this.cause = options?.cause;
    this.httpStatusCode = options?.httpStatusCode;
  }

  /**
   * Creates a secret error from an SSM exception.
   */
  static fromSSMException = (
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
