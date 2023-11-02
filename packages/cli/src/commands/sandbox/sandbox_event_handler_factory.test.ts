import { ClientConfigFormat } from '@aws-amplify/client-config';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import assert from 'node:assert';
import { it, mock } from 'node:test';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'node:path';

void it('calls the client config adapter on the successfulDeployment event', async () => {
  const generateClientConfigMock =
    mock.fn<ClientConfigGeneratorAdapter['generateClientConfigToFile']>();

  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: generateClientConfigMock,
  } as unknown as ClientConfigGeneratorAdapter;

  const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
    clientConfigGeneratorAdapterMock,
    'test-out',
    ClientConfigFormat.MJS
  );

  const eventFactory = new SandboxEventHandlerFactory(
    async () => new SandboxBackendIdentifier('test')
  );

  await Promise.all(
    eventFactory
      .getSandboxEventHandlers({
        appName: 'my-app',
        clientConfigLifecycleHandler,
      })
      .successfulDeployment.map((e) => e())
  );

  assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments, [
    { backendId: 'test', disambiguator: 'sandbox' },
    'test-out',
    'mjs',
  ]);
});

void it('calls deleteClientConfigFile on client config adapter on the successfulDeletion event', async () => {
  const clientConfigGeneratorAdapterMock =
    {} as unknown as ClientConfigGeneratorAdapter;

  const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
    clientConfigGeneratorAdapterMock,
    'test-out',
    ClientConfigFormat.MJS
  );

  mock.method(fs, 'lstatSync', () => {
    return { isFile: () => false, isDir: () => true };
  });

  const fspMock = mock.method(fsp, 'rm', () => Promise.resolve());

  const eventFactory = new SandboxEventHandlerFactory(
    async () => new SandboxBackendIdentifier('test')
  );

  await Promise.all(
    eventFactory
      .getSandboxEventHandlers({
        appName: 'my-app',
        clientConfigLifecycleHandler,
      })
      .successfulDeletion.map((e) => e())
  );

  assert.strictEqual(fspMock.mock.callCount(), 1);
  assert.deepStrictEqual(
    fspMock.mock.calls[0].arguments[0],
    path.join(process.cwd(), 'test-out', 'amplifyconfiguration.mjs')
  );
});
