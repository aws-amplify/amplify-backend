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
  ModelSchema,
  ModelSchemaParamShape,
} from '@aws-amplify/data-schema';

export { AuthClient, AuthUser, SeedFunction };

export const getAuthClient = (outputs: any): AuthClient => {
  return new DefaultAuthClient(
    new CognitoIdentityProviderClient(),
    outputs['auth']
  );
};

const seedFunctions: Array<SeedFunction<Record<any, any>>> = [];

const seedFunctions2: Array<Function> = [];

const seedFunctions4: Array<Function> = [];

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
export const defineSeed3 = <
  T extends object,
  TSchema extends ModelSchema<ModelSchemaParamShape>
>(
  seedFunction: (
    clients: OmitNever<{
      data: KeysByType<T, Seedable<'data'>> extends never
        ? never
        // @ts-ignore
        : V6Client<ClientSchema<TSchema>>;
      auth: KeysByType<T, Seedable<'auth'>> extends never ? never : AuthClient;
    }>
  ) => Promise<void>
): void => {
  // todo
};

export const defineSeed4 = (
  seedFunction: (auth: AuthClient | undefined) => Promise<void>
): void => {
  seedFunctions4.push(seedFunction);
};

process.once('beforeExit', async () => {
  if (
    (seedFunctions && seedFunctions.length > 0) ||
    (seedFunctions2 && seedFunctions2.length > 0) ||
    (seedFunctions4 && seedFunctions4.length > 0)
  ) {
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
      for (const seedFunction4 of seedFunctions4) {
        await seedFunction4.call(this, authClient);
      }
    } catch (e) {
      console.log(e);
    } finally {
      console.log('after seed functions');
    }
  }
});
