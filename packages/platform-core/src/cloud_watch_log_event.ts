/**
 * Represents a CloudWatch Log Event that will be printed to the terminal
 */
export type CloudWatchLogEvent = {
  /**
   * The log event message
   */
  readonly message: string;

  /**
   * The name of the log group
   */
  readonly logGroupName: string;

  /**
   * The time at which the event occurred
   */
  timestamp: Date;
};
