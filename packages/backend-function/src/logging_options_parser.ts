import { FunctionLoggingOptions } from './factory.js';
import { ApplicationLogLevel, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import {
  LogLevelConverter,
  LogRetentionConverter,
} from '@aws-amplify/platform-core/cdk';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export type CDKLoggingOptions = {
  level?: ApplicationLogLevel;
  retention?: RetentionDays;
  format?: LoggingFormat;
};

/**
 * Converts logging options to CDK.
 */
export const convertLoggingOptionsToCDK = (
  loggingOptions: FunctionLoggingOptions
): CDKLoggingOptions => {
  let level: ApplicationLogLevel | undefined = undefined;
  if ('level' in loggingOptions) {
    level = new LogLevelConverter().toCDKLambdaApplicationLogLevel(
      loggingOptions.level
    );
  }
  const retention = new LogRetentionConverter().toCDKRetentionDays(
    loggingOptions.retention
  );
  const format = convertFormat(loggingOptions.format);

  return {
    level,
    retention,
    format,
  };
};

const convertFormat = (format: 'json' | 'text' | undefined) => {
  switch (format) {
    case undefined:
      return undefined;
    case 'json':
      return LoggingFormat.JSON;
    case 'text':
      return LoggingFormat.TEXT;
  }
};
