import { generateClientConfig } from '@aws-amplify/client-config';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';

export type SeedFunction = () => Promise<void>;

const seedFunctions: Array<SeedFunction> = [];

export const defineSeed = (seedFunction: SeedFunction) => {
  seedFunctions.push(seedFunction);
};

process.once('beforeExit', async () => {
  const backendId = await new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  ).resolve();
  const clientConfig = await generateClientConfig(backendId, '1');
  console.log(clientConfig);
  for (const seedFunction of seedFunctions) {
    await seedFunction();
  }
});
