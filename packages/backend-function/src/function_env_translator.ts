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
  private ssmPaths: string[] = [];
  private environmentRecord: Record<string, string> = {};
  private readonly ssmEnvVars: SsmEnvVars = {};
  private readonly amplifySsmEnvConfigKey = 'AMPLIFY_SSM_ENV_CONFIG';

  /**
   * Initialize translated environment variable records
   */
  constructor(
    private readonly scope: Construct,
    private readonly functionEnvironmentProp: Required<FunctionProps>['environment'],
    private readonly backendSecretResolver: BackendSecretResolver
  ) {
    const ssmValuePlaceholderText = '<value will be resolved during runtime>';

    for (const [key, value] of Object.entries(this.functionEnvironmentProp)) {
      if (key === this.amplifySsmEnvConfigKey) {
        throw new Error(
          `${this.amplifySsmEnvConfigKey} is a reserved environment variable name`
        );
      }
      if (typeof value !== 'string') {
        const { branchSecretPath, sharedSecretPath } =
          this.backendSecretResolver.resolvePath(value);
        this.environmentRecord[key] = ssmValuePlaceholderText;
        this.ssmEnvVars[branchSecretPath] = {
          name: key,
          sharedPath: sharedSecretPath,
        };
        this.ssmPaths.push(branchSecretPath, sharedSecretPath);
      } else {
        this.environmentRecord[key] = value;
      }
    }
  }

  addSsmEnvironmentEntry = (name: string, ssmPath: string) => {
    this.ssmPaths.push(ssmPath);
    this.ssmEnvVars[ssmPath] = { name };
  };

  getEnvironmentRecord = () => {
    this.environmentRecord[this.amplifySsmEnvConfigKey] = JSON.stringify(
      this.ssmEnvVars
    );
    return this.environmentRecord;
  };

  getSsmPolicyStatement = (): iam.PolicyStatement | undefined => {
    if (this.ssmPaths.length === 0) {
      return;
    }

    const stack = Stack.of(this.scope);

    const resourceArns = this.ssmPaths.map(
      (path) => `arn:aws:ssm:${stack.region}:${stack.account}:parameter${path}`
    );

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameters'],
      resources: resourceArns,
    });
  };
}

/**
 * Defines metadata around environment variable values that are fetched from SSM during runtime of the lambda function
 */
export type SsmEnvVars = {
  /**
   * The record key names are the branch-specific SSM paths to fetch the value from
   */
  [branchPath: string]: {
    /**
     * The environment variable name to place the resolved value in
     */
    name: string;
    /**
     * An optional "fallback" SSM path where the value will be looked up if not found at the branch-specific path
     */
    sharedPath?: string;
  };
};
