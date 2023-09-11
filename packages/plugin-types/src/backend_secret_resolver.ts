import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';
import { UniqueBackendIdentifier } from './unique_backend_identifier.js';

export type BackendSecretResolver = {
  /**
   * Returns a deep copy of props where any occurrence of BackendSecret are replaced
   * by SecretValue type.
   */
  resolveSecrets: <T>(props: T) => Replace<T, BackendSecret, SecretValue>;
};

export type BackendSecret = {
  /**
   * Resolves the given secret to a CDK token.
   */
  resolve: (
    scope: Construct,
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ) => SecretValue;
};

/**
 * Utility type that replaces Initial with Substitute type anywhere in an object type T
 * @example
 *     field1: string,
 *     field2: SomeType
 *     field3:
 *         nestedField: SomeType,
 *         anotherField: number
 *
 * Replace\<T, SomeType, AnotherType\>:
 *
 *     field1: string,
 *     field2: AnotherType,
 *     field3:
 *         nestedField: AnotherType
 *         anotherField: number
 */

export type Replace<T, Initial, Substitute> = T extends Initial
  ? Substitute
  : T extends object
  ? { [K in keyof T]: Replace<T[K], Initial, Substitute> }
  : T;
