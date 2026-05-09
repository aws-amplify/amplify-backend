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
   * Constructs a new instance of the SsmEnvironmentEntriesGeneratorStub class.
   * @param scope The scope of the construct.
   */
  constructor(private readonly scope: Construct) {}
  /**
   * Stub implementation for testing. Synthesizes SSM parameters using a test path.
   */
  generateSsmEnvironmentEntries = (scopeContext: Record<string, string>) =>
    Object.entries(scopeContext).map(([contextKey, contextValue]) => {
      const parameterPath = `/this/is/a/test/path/${contextKey}`;
      new StringParameter(this.scope, `${contextKey}Parameter`, {
        parameterName: parameterPath,
        stringValue: contextValue,
      });
      return {
        name: contextKey,
        path: parameterPath,
      };
    });
}
