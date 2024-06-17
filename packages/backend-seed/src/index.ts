import { generateClientConfig } from '@aws-amplify/client-config';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { AuthClient, AuthUser, SeedFunction } from './types.js';
import { DefaultAuthClient } from './auth_client.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SchemaSeedable, Seedable } from '@aws-amplify/plugin-types';
import { V6Client } from '@aws-amplify/api-graphql';
import { ClientSchema } from '@aws-amplify/data-schema';
import {
  // TODO these types were hackily exposed in node modules dir
  CombinedModelSchema,
  GenericModelSchema,
  ModelSchema,
  ModelSchemaParamShape,
} from '@aws-amplify/data-schema';

export { AuthClient, AuthUser, SeedFunction };

const seedFunctions: Array<SeedFunction<Record<any, any>>> = [];

const seedFunctions2: Array<Function> = [];

export const defineSeed = <SchemaType extends Record<any, any>>(
  seedFunction: SeedFunction<SchemaType>
) => {
  seedFunctions.push(seedFunction);
};

// A type that picks out the keys for properties from `Source` that are
// assignable to `PickType`
export type KeysByType<Source extends object, PickType> = {
  [Key in keyof Source]: Source[Key] extends PickType ? Key : never;
}[keyof Source];

// A type that picks the properties from `Source` that are assignable to `Picktype`
export type PickByType<Source extends object, PickType> = Pick<
  Source,
  KeysByType<Source, PickType>
>;

export type OmitNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export const defineSeed2 = <
  T extends object,
  TSchema extends Record<any, any> = Record<any, any>
>(
  seedFunction: (
    clients: OmitNever<{
      data: KeysByType<T, Seedable<'data'>> extends never
        ? never
        : V6Client<TSchema>;
      auth: KeysByType<T, Seedable<'auth'>> extends never ? never : AuthClient;
    }>
  ) => Promise<void>
): void => {
  seedFunctions2.push(seedFunction);
};

/**
 * Todo
 * Is it possible to:
 * - Generate client keys matching backend verticals?
 * - How do we access types using custom keys?
 */
export const defineSeed3 = <T extends object, TSchema extends ModelSchema<ModelSchemaParamShape>>(
  seedFunction: (
    clients: OmitNever<{
      data: KeysByType<T, Seedable<'data'>> extends never
        ? never
        : V6Client<ClientSchema<TSchema>>;
      auth: KeysByType<T, Seedable<'auth'>> extends never ? never : AuthClient;
    }>
  ) => Promise<void>
): void => {
  // todo
};

process.once('beforeExit', async () => {
  const backendId = await new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  ).resolve();
  const clientConfig = await generateClientConfig(backendId, '0');
  Amplify.configure(clientConfig);
  const dataClient = generateClient<Record<any, any>>();
  const authClient = new DefaultAuthClient(
    new CognitoIdentityProviderClient(),
    clientConfig['auth']
  );
  try {
    for (const seedFunction of seedFunctions) {
      await seedFunction(dataClient, authClient);
    }
    for (const seedFunction2 of seedFunctions2) {
      await seedFunction2.call(this, {
        data: dataClient,
        auth: authClient,
      });
    }
  } catch (e) {
    console.log(e);
  } finally {
    console.log('after seed functions');
  }
});
