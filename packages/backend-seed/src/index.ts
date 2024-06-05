import { generateClientConfig } from '@aws-amplify/client-config';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { V6Client } from '@aws-amplify/api-graphql';

// TODO is there a better way to bring in schema typings? It must come from customer project.
export type SeedFunction<SchemaType extends Record<any, any>> = (
  // TODO how can data client dynamically typed here?
  dataClient: V6Client<SchemaType>
) => Promise<void>;

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
  const dataClient = generateClient();
  try {
    for (const seedFunction of seedFunctions) {
      await seedFunction(dataClient);
    }
  } catch (e) {
    console.log(e);
  }
});
