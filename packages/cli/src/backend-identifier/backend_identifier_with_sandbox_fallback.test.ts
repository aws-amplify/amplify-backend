import assert from 'node:assert';
import { it } from 'node:test';
import { SandboxBackendIdResolver } from '../commands/sandbox/sandbox_id_resolver.js';
import { BackendIdentifierResolver } from './backend_identifier_resolver.js';
import { BackendIdentifierResolverWithFallback } from './backend_identifier_with_sandbox_fallback.js';

void it('if backend identifier resolves without error, the resolved id is returned', async () => {
  const namespaceResolver = {
    resolve: () => Promise.resolve('testAppName'),
  };

  const defaultResolver = new BackendIdentifierResolver(namespaceResolver);
  const sandboxResolver = new SandboxBackendIdResolver(namespaceResolver);
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver
  );
  const resolvedId = await backendIdResolver.resolve({
    appId: 'hola',
    branch: 'mundo',
  });
  assert.deepEqual(resolvedId, {
    namespace: 'hola',
    name: 'mundo',
    type: 'branch',
  });
});

void it('uses the sandbox id if the default identifier resolver fails', async () => {
  const appName = 'testAppName';
  const namespaceResolver = {
    resolve: () => Promise.resolve(appName),
  };

  const defaultResolver = new BackendIdentifierResolver(namespaceResolver);
  const username = 'test-user';
  const sandboxResolver = new SandboxBackendIdResolver(
    namespaceResolver,
    () =>
      ({
        username,
      } as never)
  );
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver
  );
  const resolvedId = await backendIdResolver.resolve({});
  assert.deepEqual(resolvedId, {
    namespace: appName,
    type: 'sandbox',
    name: 'test-user',
  });
});
