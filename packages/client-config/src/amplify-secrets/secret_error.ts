/**
 * Secret client error.
 */
export class SecretClientError implements Error {
  public readonly name: string = 'ClientError';
  /**
   * Construct a new instance of a secret client error.
   */
  constructor(public readonly message: string) {}
}

/**
 * Secret server error.
 */
export class SecretServerError implements Error {
  public readonly name: string = 'ServerError';
  /**
   * Construct a new instance of a secret server error.
   */
  constructor(public readonly message: string) {}
}
