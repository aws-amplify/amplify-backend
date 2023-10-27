/**
 * AccountIdParser
 */
export class ArnParser {
  /**
   * Attempts to parse an account id from an ARN
   */
  tryAccountIdFromArn = (arn: string): string | undefined => {
    return arn ? arn.split(':')?.[4] : undefined;
  };

  /**
   * Attempts to parse a region from an ARN
   */
  tryRegionFromArn = (arn: string): string | undefined => {
    return arn ? arn.split(':')?.[3] : undefined;
  };
}
