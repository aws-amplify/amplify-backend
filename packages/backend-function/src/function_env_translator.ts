import {
  BackendSecret,
  BackendSecretResolver,
} from '@aws-amplify/plugin-types';
import { Arn, Lazy, Stack } from 'aws-cdk-lib';
import { FunctionProps } from './factory.js';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  amplifySsmEnvConfigKey,
  ssmValuePlaceholderText,
} from './constants.js';

/**
 * Translates function environment props into appropriate environment records and builds a policy statement
 * in order to resolve secrets in environment props.
 */
export class FunctionEnvironmentTranslator {
  private readonly ssmPaths: string[] = [];
  private readonly ssmEnvVars: SsmEnvVars = {};

  // List of environment variable names for typed shim generation
  private readonly amplifyBackendEnvVarNames: string[] = [];

  /**
   * Initialize translated environment variable records
   */
  constructor(
    private readonly lambda: NodejsFunction, // we need to use a specific type here so that we have all the method goodies
    private readonly functionEnvironmentProp: Required<FunctionProps>['environment'],
    private readonly backendSecretResolver: BackendSecretResolver,
    private readonly functionEnvironmentTypeGenerator: FunctionEnvironmentTypeGenerator,
  ) {
    for (const [key, value] of Object.entries(this.functionEnvironmentProp)) {
      this.addEnvironmentEntry(key, value);
    }

    // add an environment variable for ssm parameter metadata that is resolved after initialization but before synth is finalized
    this.lambda.addEnvironment(
      amplifySsmEnvConfigKey,
      Lazy.string({
        produce: () => JSON.stringify(this.ssmEnvVars),
      }),
    );

    this.lambda.node.addValidation({
      validate: () => {
        // only add the ssm access policy if there are ssm paths
        if (this.ssmPaths.length > 0) {
          const ssmAccessPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['ssm:GetParameters'],
            resources: this.ssmPaths
              .map((path) => (path.startsWith('/') ? path.slice(1) : path)) // the Arn formatter will add a leading slash between the resource and resourceName
              .map((path) =>
                Arn.format(
                  {
                    service: 'ssm',
                    resource: 'parameter',
                    resourceName: path,
                  },
                  Stack.of(this.lambda),
                ),
              ),
          });
          this.lambda.grantPrincipal.addToPrincipalPolicy(ssmAccessPolicy);
        }
        return [];
      },
    });

    // Using CDK validation mechanism as a way to generate a typed process.env shim file at the end of synthesis
    this.lambda.node.addValidation({
      validate: (): string[] => {
        this.functionEnvironmentTypeGenerator.generateTypedProcessEnvShim(
          this.amplifyBackendEnvVarNames,
        );
        return [];
      },
    });
  }

  /**
   * Adds an environment variable to the lambda to be used at runtime
   * @param key The environment variable name
   * @param value envVar value that can be a plain text or a secret
   */
  addEnvironmentEntry = (key: string, value: string | BackendSecret) => {
    if (key === amplifySsmEnvConfigKey) {
      throw new AmplifyUserError('FunctionReservedEnvironmentVariableError', {
        message: `${amplifySsmEnvConfigKey} is a reserved environment variable name`,
        resolution: 'Please use a non-reserved environment variable name.',
      });
    }
    if (typeof value === 'undefined') {
      throw new AmplifyUserError('InvalidFunctionConfigurationError', {
        message: `The value of environment variable ${key} is undefined.`,
        resolution: `Ensure that all defineFunction environment variables are defined.`,
      });
    } else if (typeof value === 'string') {
      this.lambda.addEnvironment(key, value);
    } else {
      const { branchSecretPath, sharedSecretPath } =
        this.backendSecretResolver.resolvePath(value);
      this.lambda.addEnvironment(key, ssmValuePlaceholderText);
      this.ssmEnvVars[key] = {
        path: branchSecretPath,
        sharedPath: sharedSecretPath,
      };
      this.ssmPaths.push(branchSecretPath, sharedSecretPath);
    }
    this.amplifyBackendEnvVarNames.push(key);
  };

  /**
   * Adds an environment variable to the lambda whose value will be fetched from SSM at runtime
   * @param name The environment variable name
   * @param ssmPath The SSM path where the value is stored
   */
  addSsmEnvironmentEntry = (name: string, ssmPath: string) => {
    this.lambda.addEnvironment(name, ssmValuePlaceholderText);
    this.ssmPaths.push(ssmPath);
    this.ssmEnvVars[name] = { path: ssmPath };
    this.amplifyBackendEnvVarNames.push(name);
  };
}

/**
 * Defines metadata around environment variable values that are fetched from SSM during runtime of the lambda function
 */
export type SsmEnvVars = {
  /**
   * The environment variable name to place the resolved value in
   */
  [name: string]: {
    /**
     * The record key names are the branch/sandbox specific SSM paths to fetch the value from
     */
    path: string;
    /**
     * An optional "fallback" SSM path where the value will be looked up if not found at the branch-specific path
     */
    sharedPath?: string;
  };
};
