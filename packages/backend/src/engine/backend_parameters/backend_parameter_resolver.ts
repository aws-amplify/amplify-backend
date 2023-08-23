import {
  BackendParameter,
  BackendParameterResolver,
  Replace,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';

/**
 * BackendParameterResolver that delegates to BackendParameter.resolve().
 * Optionally, a literal string can be passed in, in which case resolve is a pass-through of the literal
 */
export class OptionalPassThroughBackendParameterResolver
  implements BackendParameterResolver
{
  /**
   * Construct with context about the backend that is being deployed.
   * These values are used to resolve the correct underlying parameter value
   */
  constructor(
    private readonly scope: Construct,
    private readonly backendId: string,
    private readonly branchName: string
  ) {}

  /**
   * Recursively traverses arg replacing any BackendParameters that it finds with the result of calling BackendParameter.resolve()
   * The output is a copy of the input with the necessary replacements made. The input is unchanged
   */
  resolveParameters<T>(arg: T): Replace<T, BackendParameter, SecretValue> {
    const isBackendParameter = (arg: unknown): arg is BackendParameter =>
      !!arg &&
      typeof arg === 'object' &&
      'resolve' in arg &&
      typeof arg.resolve === 'function';

    if (isBackendParameter(arg)) {
      return arg.resolve(
        this.scope,
        this.backendId,
        this.branchName
      ) as Replace<T, BackendParameter, SecretValue>;
    } else if (Array.isArray(arg)) {
      return arg.map((prop) => this.resolveParameters(prop)) as Replace<
        T,
        BackendParameter,
        SecretValue
      >;
    } else if (arg && typeof arg === 'object') {
      const result: Partial<Replace<T, BackendParameter, SecretValue>> = {};
      Object.entries(arg).forEach(([key, value]) => {
        result[key as keyof typeof result] = this.resolveParameters(
          value
        ) as never;
      });
      return result as Replace<T, BackendParameter, SecretValue>;
    } else {
      return arg as Replace<T, BackendParameter, SecretValue>;
    }
  }
}
