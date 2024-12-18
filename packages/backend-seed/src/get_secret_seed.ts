import { PackageJsonReader } from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from './namespace_resolver.js';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';

//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  const backendId = await new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  ).resolve();
  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(backendId, { name: secretName });
  return secret.value;
};
