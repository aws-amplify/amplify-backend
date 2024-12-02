import { LogLevel, LogRetention } from '@aws-amplify/plugin-types';
import { ApplicationLogLevel } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

/**
 * Converts LogRetention to CDK types.
 */
export class LogRetentionConverter {
  toCDKRetentionDays = (
    retention: LogRetention | undefined
  ): RetentionDays | undefined => {
    switch (retention) {
      case undefined:
        return undefined;

      case '1 day':
        return RetentionDays.ONE_DAY;
      case '3 days':
        return RetentionDays.THREE_DAYS;
      case '5 days':
        return RetentionDays.FIVE_DAYS;
      case '1 week':
        return RetentionDays.ONE_WEEK;
      case '2 weeks':
        return RetentionDays.TWO_WEEKS;
      case '1 month':
        return RetentionDays.ONE_MONTH;
      case '2 months':
        return RetentionDays.TWO_MONTHS;
      case '3 months':
        return RetentionDays.THREE_MONTHS;
      case '4 months':
        return RetentionDays.FOUR_MONTHS;
      case '5 months':
        return RetentionDays.FIVE_MONTHS;
      case '6 months':
        return RetentionDays.SIX_MONTHS;
      case '1 year':
        return RetentionDays.ONE_YEAR;
      case '13 months':
        return RetentionDays.THIRTEEN_MONTHS;
      case '18 months':
        return RetentionDays.EIGHTEEN_MONTHS;
      case '2 years':
        return RetentionDays.TWO_YEARS;
      case '3 years':
        return RetentionDays.THREE_YEARS;
      case '5 years':
        return RetentionDays.FIVE_YEARS;
      case '6 years':
        return RetentionDays.SIX_YEARS;
      case '7 years':
        return RetentionDays.SEVEN_YEARS;
      case '8 years':
        return RetentionDays.EIGHT_YEARS;
      case '9 years':
        return RetentionDays.NINE_YEARS;
      case '10 years':
        return RetentionDays.TEN_YEARS;
      case 'infinite':
        return RetentionDays.INFINITE;
    }
  };
}

/**
 * Converts LogLevel to CDK types.
 */
export class LogLevelConverter {
  toCDKLambdaApplicationLogLevel = (
    logLevel: LogLevel | undefined
  ): ApplicationLogLevel | undefined => {
    switch (logLevel) {
      case undefined: {
        return undefined;
      }
      case 'info': {
        return ApplicationLogLevel.INFO;
      }
      case 'debug': {
        return ApplicationLogLevel.DEBUG;
      }
      case 'warn': {
        return ApplicationLogLevel.WARN;
      }
      case 'error': {
        return ApplicationLogLevel.ERROR;
      }
      case 'fatal': {
        return ApplicationLogLevel.FATAL;
      }
      case 'trace': {
        return ApplicationLogLevel.TRACE;
      }
    }
  };
}
