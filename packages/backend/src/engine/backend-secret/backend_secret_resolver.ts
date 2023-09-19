import {
  BackendSecret,
  BackendSecretResolver,
  Replace,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';

/**
 * DefaultBackendSecretResolver deeply traverses the input object and resolves all BackendSecret instances.
 */
export class DefaultBackendSecretResolver implements BackendSecretResolver {
  /**
   * Construct with context about the backend that is being deployed.
   * These values are used to resolve the correct underlying secret value
   */
  constructor(
    private readonly scope: Construct,
    private readonly uniqueBackendIdentifier: UniqueBackendIdentifier
  ) {}

  private isBackendSecret = (arg: unknown): arg is BackendSecret =>
    !!arg &&
    typeof arg === 'object' &&
    'resolve' in arg &&
    typeof arg.resolve === 'function';

  /**
   * Recursively traverses arg replacing any BackendSecret that it finds with the result of calling BackendSecret.resolve()
   * The output is a copy of the input with the necessary replacements made. The input is unchanged.
   */
  resolveSecrets = <T>(arg: T): Replace<T, BackendSecret, SecretValue> => {
    if (this.isBackendSecret(arg)) {
      return arg.resolve(this.scope, this.uniqueBackendIdentifier) as Replace<
        T,
        BackendSecret,
        SecretValue
      >;
    } else if (Array.isArray(arg)) {
      return arg.map((prop) => this.resolveSecrets(prop)) as Replace<
        T,
        BackendSecret,
        SecretValue
      >;
    } else if (arg && typeof arg === 'object') {
      const result: Partial<Replace<T, BackendSecret, SecretValue>> = {};
      Object.entries(arg).forEach(([key, value]) => {
        result[key as keyof typeof result] = this.resolveSecrets(
          value
        ) as never;
      });
      return result as Replace<T, BackendSecret, SecretValue>;
    }
    return arg as Replace<T, BackendSecret, SecretValue>;
  };
}
