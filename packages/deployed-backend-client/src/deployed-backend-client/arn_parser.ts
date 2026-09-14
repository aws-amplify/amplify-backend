export type ParsedArn = {
  accountId: string | undefined;
  region: string | undefined;
};

/**
 * ArnParser
 */
export class ArnParser {
  /**
   * Attempts to parse fields from an ARN
   */
  tryParseArn = (arn: string): ParsedArn => {
    return {
      accountId: arn ? arn.split(':')?.[4] : undefined,
      region: arn ? arn.split(':')?.[3] : undefined,
    };
  };
}
