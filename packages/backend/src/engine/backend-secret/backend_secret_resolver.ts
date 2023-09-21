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
    private readonly uniqueBackendIdentifier: UniqueBackendIdentifier
  ) {}

  private isBackendSecret = (arg: unknown): arg is BackendSecret =>
    !!arg &&
    typeof arg === 'object' &&
    'resolve' in arg &&
    typeof arg.resolve === 'function';

  /**
   * Recursively traverses arg replacing any BackendSecret that it finds with the result of calling BackendSecret.resolve()
   * BackendSecret.resolve(). The output is a copy of the input with the necessary replacements made. The input is unchanged.
   * Note that the replacement will not work against classes with private/protected members since they are not iterable.
   * If these class contains no secret to resolve (and it must not be), use the Ignore and ignoreTypes to bypass.
   */
  resolveSecrets = <T, Ignore extends any[] = []>(
    scope: Construct,
    arg: T,
    ignoreTypes?: { new (...args: any[]): Ignore[number] }[]
  ): Replace<T, BackendSecret, SecretValue, Ignore> => {
    if (this.isBackendSecret(arg)) {
      return arg.resolve(scope, this.uniqueBackendIdentifier) as Replace<
        T,
        BackendSecret,
        SecretValue,
        Ignore
      >;
    } else if (Array.isArray(arg)) {
      return arg.map((prop) =>
        this.resolveSecrets(scope, prop, ignoreTypes)
      ) as Replace<T, BackendSecret, SecretValue, Ignore>;
    } else if (arg && typeof arg === 'object') {
      const result: Partial<Replace<T, BackendSecret, SecretValue, Ignore>> =
        {};
      Object.entries(arg).forEach(([key, value]) => {
        if (ignoreTypes && ignoreTypes.some((type) => value instanceof type)) {
          result[key as keyof typeof result] = value;
        } else {
          result[key as keyof typeof result] = this.resolveSecrets(
            scope,
            value,
            ignoreTypes
          );
        }
      });
      return result as Replace<T, BackendSecret, SecretValue, Ignore>;
    }
    return arg as Replace<T, BackendSecret, SecretValue, Ignore>;
  };
}
