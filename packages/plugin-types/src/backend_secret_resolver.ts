import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';
import { UniqueBackendIdentifier } from './unique_backend_identifier.js';

/**
 * The backend secret resolver.
 */
export type BackendSecretResolver = {
  /**
   * Returns a deep copy of props where any occurrence of BackendSecret are replaced
   * by SecretValue type.
   */
  resolveSecrets: <T, Ignore extends any[]>(
    arg: T,
    ignoreTypes?: { new (...args: any[]): Ignore[number] }[]
  ) => Replace<T, BackendSecret, SecretValue, Ignore>;
};

/**
 * The backend secret.
 */
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
 * Utility type that replaces Initial with Substitute type anywhere in an object type T.
 * The recursive type replacement will not traverse the subtree where its root node type
 * is included in Ignore type(s).
 * @example
 *     field1: string,
 *     field2: SomeType
 *     field3: SomeIgnoreType
 *         nestedField: SomeType,
 *         anotherField: number
 *
 * Replace\<T, SomeType, AnotherType, [SomeIgnoreType]\>:
 *
 *     field1: string,
 *     field2: AnotherType,
 *     field3: SomeIgnoreType
 *         nestedField: SomeType // Note it is not replaced as field3 is ignored.
 *         anotherField: number
 */

export type Replace<
  T,
  Initial,
  Substitute,
  Ignore extends any[] = []
> = T extends Initial
  ? Substitute
  : T extends (...args: any[]) => any
  ? T
  : T extends Ignore[number]
  ? T
  : T extends object
  ? { [K in keyof T]: Replace<T[K], Initial, Substitute, Ignore> }
  : T;
