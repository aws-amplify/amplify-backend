import { BackendSecretResolver } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FunctionProps } from './factory.js';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Translates function environment props into appropriate environment records and builds a policy statement
 * in order to resolve secrets in environment props.
 */
export class FunctionEnvironmentTranslator {
  private secretPaths: string[] = [];
  private environmentRecord: Record<string, string> = {};

  /**
   * Initialize translated environment variable records
   */
  constructor(
    private readonly scope: Construct,
    private readonly functionEnvironmentProp: Required<FunctionProps>['environment'],
    private readonly backendSecretResolver: BackendSecretResolver
  ) {
    const secretPlaceholderText = '<value will be resolved during runtime>';
    const amplifySecretPaths = 'AMPLIFY_SECRET_PATHS';
    const secretPathEnvVars: AmplifySecretPaths = {};

    for (const [key, value] of Object.entries(this.functionEnvironmentProp)) {
      if (key === amplifySecretPaths) {
        throw new Error(
          `${amplifySecretPaths} is a reserved environment variable name`
        );
      }
      if (typeof value !== 'string') {
        const { branchSecretPath, sharedSecretPath } =
          this.backendSecretResolver.resolvePath(value);
        this.environmentRecord[key] = secretPlaceholderText;
        secretPathEnvVars[branchSecretPath] = {
          name: key,
          sharedPath: sharedSecretPath,
        };
        this.secretPaths.push(branchSecretPath, sharedSecretPath);
      } else {
        this.environmentRecord[key] = value;
      }
    }

    this.environmentRecord[amplifySecretPaths] =
      JSON.stringify(secretPathEnvVars);
  }

  getEnvironmentRecord = () => {
    return this.environmentRecord;
  };

  getSecretPolicyStatement = (): iam.PolicyStatement | undefined => {
    if (this.secretPaths.length === 0) {
      return;
    }

    const stack = Stack.of(this.scope);

    const resourceArns = this.secretPaths.map(
      (path) => `arn:aws:ssm:${stack.region}:${stack.account}:parameter${path}`
    );

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameters'],
      resources: resourceArns,
    });
  };
}

export type AmplifySecretPaths = {
  [branchPath: string]: {
    name: string;
    sharedPath: string;
  };
};
