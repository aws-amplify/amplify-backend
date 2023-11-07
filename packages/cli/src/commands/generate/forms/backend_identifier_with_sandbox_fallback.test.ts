import assert from 'node:assert';
import { it } from 'node:test';
import { SandboxIdResolver } from '../../sandbox/sandbox_id_resolver.js';
import { BackendIdentifierResolverWithSandboxFallback } from './backend_identifier_with_sandbox_fallback.js';

void it('if backend identifier resolves without error, the resolved id is returned', async () => {
  const appNameResolver = {
    resolve: async () => Promise.resolve('testAppName'),
  };
  const sandboxResolver = new SandboxIdResolver(appNameResolver);
  const backendIdResolver = new BackendIdentifierResolverWithSandboxFallback(
    appNameResolver,
    sandboxResolver
  );
  const resolvedId = await backendIdResolver.resolve({ branch: 'test' });
  assert.deepEqual(resolvedId, { appName: 'testAppName', branchName: 'test' });
});

void it('uses the sandbox id if the default identifier resolver fails', async () => {
  const appName = 'testAppName';
  const appNameResolver = {
    resolve: async () => Promise.resolve(appName),
  };
  const username = 'test-user';
  const sandboxResolver = new SandboxIdResolver(
    appNameResolver,
    () =>
      ({
        username,
      } as never)
  );
  const backendIdResolver = new BackendIdentifierResolverWithSandboxFallback(
    appNameResolver,
    sandboxResolver
  );
  const resolvedId = await backendIdResolver.resolve({});
  assert.deepEqual(resolvedId, {
    backendId: `${appName}-${username}`,
    disambiguator: 'sandbox',
  });
});
