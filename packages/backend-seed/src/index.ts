import { generateClientConfig } from '@aws-amplify/client-config';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { AuthClient, AuthUser, SeedFunction } from './types.js';
import { DefaultAuthClient } from './auth_client.js';

export { AuthClient, AuthUser, SeedFunction };

const seedFunctions: Array<SeedFunction<Record<any, any>>> = [];

export const defineSeed = <SchemaType extends Record<any, any>>(
  seedFunction: SeedFunction<SchemaType>
) => {
  seedFunctions.push(seedFunction);
};

process.once('beforeExit', async () => {
  const backendId = await new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  ).resolve();
  const clientConfig = await generateClientConfig(backendId, '0');
  Amplify.configure(clientConfig);
  console.log(clientConfig);
  const dataClient = generateClient<Record<any, any>>();
  const authClient = new DefaultAuthClient();
  try {
    for (const seedFunction of seedFunctions) {
      await seedFunction(dataClient, authClient);
    }
  } catch (e) {
    console.log(e);
  }
});
