import { FunctionLoggingOptions } from './factory.js';
import { ApplicationLogLevel, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import {
  LogLevelConverter,
  LogRetentionConverter,
} from '@aws-amplify/platform-core/cdk';
import { ILogGroup, LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * CDK Lambda logging options using non-deprecated properties
 * - level: ApplicationLogLevel for the lambda function (maps to applicationLogLevelV2)
 * - format: Logging format (JSON or TEXT)
 * - logGroup: Custom log group for the function (preferred over using logRetention directly)
 */
export type CDKLoggingOptions = {
  level?: ApplicationLogLevel;
  format?: LoggingFormat;
  logGroup?: ILogGroup;
};

/**
 * Creates a LogGroup with the specified retention settings
 * This replaces the deprecated logRetention property on NodejsFunction
 */
export const createLogGroup = (
  scope: Construct,
  id: string,
  loggingOptions: FunctionLoggingOptions,
): ILogGroup => {
  const retentionDays = new LogRetentionConverter().toCDKRetentionDays(
    loggingOptions.retention,
  );

  return new LogGroup(scope, `${id}-log-group`, {
    retention: retentionDays,
    removalPolicy: RemovalPolicy.DESTROY, // This matches Lambda's default for auto-created log groups
  });
};

/**
 * Converts logging options to CDK format using non-deprecated properties
 * Note: This function no longer includes 'retention' in the return object
 * as that property is deprecated. Instead, create a LogGroup with
 * createLogGroup() when needed.
 */
export const convertLoggingOptionsToCDK = (
  loggingOptions: FunctionLoggingOptions,
): CDKLoggingOptions => {
  let level: ApplicationLogLevel | undefined = undefined;
  if ('level' in loggingOptions) {
    level = new LogLevelConverter().toCDKLambdaApplicationLogLevel(
      loggingOptions.level,
    );
  }

  const format = convertFormat(loggingOptions.format);

  return {
    level,
    format,
  };
};

/**
 * Converts format string to LoggingFormat enum
 */
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
