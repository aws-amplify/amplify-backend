import { SsmEnvironmentEntriesGenerator } from '@aws-amplify/plugin-types';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

/**
 * Stub implementation of SsmEnvironmentEntriesGenerator used for backend unit testing
 */
export class SsmEnvironmentEntriesGeneratorStub
  implements SsmEnvironmentEntriesGenerator
{
  /**
   * Stub implementation for testing. Synthesizes SSM parameters using a test path.
   */
  generateSsmEnvironmentEntries = (
    scope: Construct,
    scopeContext: Record<string, string>
  ) =>
    Object.entries(scopeContext).map(([contextKey, contextValue]) => {
      const parameterPath = `/this/is/a/test/path/${contextKey}`;
      new StringParameter(scope, `${contextKey}Parameter`, {
        parameterName: parameterPath,
        stringValue: contextValue,
      });
      return {
        name: contextKey,
        path: parameterPath,
      };
    });
}
