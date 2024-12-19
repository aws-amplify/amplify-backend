import { DataLoggingOptions } from './types.js';
import {
  DataLogLevelConverter,
  LogRetentionConverter,
} from '@aws-amplify/platform-core/cdk';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { FieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import { DataLogLevel, LogRetention } from '@aws-amplify/plugin-types';

export type CDKLoggingOptions = {
  excludeVerboseContent: boolean;
  fieldLogLevel: FieldLogLevel;
  retention: RetentionDays;
};

const DEFAULT_EXCLUDE_VERBOSE_CONTENT: boolean = true;
const DEFAULT_LEVEL: DataLogLevel = 'none';
const DEFAULT_RETENTION: LogRetention = '1 week';

/**
 * Converts logging options to CDK.
 */
export const convertLoggingOptionsToCDK = (
  loggingOptions: DataLoggingOptions | undefined
): CDKLoggingOptions | undefined => {
  if (!loggingOptions) {
    return undefined;
  }

  // Determine if we should apply default configuration
  const shouldApplyDefaultLogging =
    loggingOptions === true ||
    (typeof loggingOptions === 'object' &&
      Object.keys(loggingOptions).length === 0);

  // Extract fields from the user's loggingOptions (if it's an object)
  const config: DataLoggingOptions =
    typeof loggingOptions === 'object' ? loggingOptions : {};

  const excludeVerboseContent = shouldApplyDefaultLogging
    ? DEFAULT_EXCLUDE_VERBOSE_CONTENT
    : config.excludeVerboseContent ?? DEFAULT_EXCLUDE_VERBOSE_CONTENT;

  // For level and retention, we rely on converters. If config is empty or logging is true, use defaults.
  const dataLogLevel = shouldApplyDefaultLogging
    ? DEFAULT_LEVEL
    : config.level ?? DEFAULT_LEVEL;

  const logRetention = shouldApplyDefaultLogging
    ? DEFAULT_RETENTION
    : config.retention ?? DEFAULT_RETENTION;

  const fieldLogLevel = new DataLogLevelConverter().toCDKFieldLogLevel(
    dataLogLevel
  )!;
  const retention = new LogRetentionConverter().toCDKRetentionDays(
    logRetention
  )!;

  return {
    excludeVerboseContent,
    fieldLogLevel,
    retention,
  };
};
