import { FunctionLoggingOptions } from './factory.js';
import { ApplicationLogLevel, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import {
  LogLevelConverter,
  LogRetentionConverter,
} from '@aws-amplify/platform-core/cdk';

/**
 * Converts logging options to CDK.
 */
export const convertLoggingOptionsToCDK = (
  loggingOptions: FunctionLoggingOptions
) => {
  let level: ApplicationLogLevel | undefined = undefined;
  if ('level' in loggingOptions) {
    level = new LogLevelConverter().toApplicationLogLevel(loggingOptions.level);
  }
  const retention = new LogRetentionConverter().toRetentionDays(
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