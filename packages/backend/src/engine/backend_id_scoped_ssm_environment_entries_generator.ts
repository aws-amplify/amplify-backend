import { ParameterPathConversions } from '@aws-amplify/platform-core';
import {
  BackendIdentifier,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { toScreamingSnakeCase } from './naming_convention_conversions.js';

/**
 * Generates SsmEnvironmentEntry[] with SSM parameters that are scoped to a specific backend identifier
 */
export class BackendIdScopedSsmEnvironmentEntriesGenerator
  implements SsmEnvironmentEntriesGenerator
{
  /**
   * Initialize with the backend identifier
   */
  constructor(
    private readonly scope: Construct,
    private readonly backendId: BackendIdentifier
  ) {}

  /**
   * Creates SSM parameters for CDK tokens in the scope provided to the constructor.
   * This allows values in scopeContext to be fetched from SSM at runtime without a deploy-time dependency between resources.
   * For this to work, the CDK tokens in scopeContext _must_ reside in the scope from the constructor.
   * This method can be called multiple times but an attempt to insert the same contextKey twice will result in an error.
   *
   * The returned SsmEnvironmentEntries must _not_ contain CDK tokens to SSM parameters.
   * Instead the SSM parameters are formatted with a naming convention and the literal string value of the parameter path is returned.
   * @example
   * Consider the following scopeContext input:
   * {
   *   STORAGE_BUCKET_NAME: <CDK token to S3 bucket name>
   * }
   *
   * This function will create an SSM parameter with a value that will resolve to the S3 bucket name at deploy time
   * The SSM parameter will be placed in the provided CDK scope which _must_ be the same as the scope that the CDK tokens in scopeContext come from
   * The return value will be
   * [
   *   {
   *     name: STORAGE_BUCKET_NAME
   *     path: /amplify/resource_reference/<backend namespace>/<backend name>/STORAGE_BUCKET_NAME
   *   }
   * ]
   *
   * The value of this parameter can then be fetched anywhere else without an explicit deploy-time dependency on the storage bucket name
   * @param scopeContext Key/value pairs of values from the scope that should be stored in SSM and retrievable using the key
   */
  generateSsmEnvironmentEntries = (scopeContext: Record<string, string>) =>
    Object.entries(scopeContext).map(([contextKey, contextValue]) => {
      const sanitizedContextKey = toScreamingSnakeCase(contextKey);
      const parameterPath =
        ParameterPathConversions.toResourceReferenceFullPath(
          this.backendId,
          sanitizedContextKey
        );
      new StringParameter(this.scope, `${sanitizedContextKey}Parameter`, {
        parameterName: parameterPath,
        stringValue: contextValue,
      });
      return {
        name: sanitizedContextKey,
        path: parameterPath,
      };
    });
}
