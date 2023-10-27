/**
 * AccountIdParser
 */
export class AccountIdParser {
  /**
   * Attempts to parse an account id from an ARN
   */
  tryFromArn = (arn: string): string | undefined => {
    return arn ? arn.split(':')?.[4] : undefined;
  };
}
