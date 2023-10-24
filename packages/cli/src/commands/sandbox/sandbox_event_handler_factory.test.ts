import { ClientConfigFormat } from '@aws-amplify/client-config';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import assert from 'node:assert';
import { it, mock } from 'node:test';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';

void it('calls the client config adapter on the successfulDeployment event', async () => {
  const generateClientConfigMock = mock.fn();
  const eventFactory = new SandboxEventHandlerFactory(
    {
      generateClientConfigToFile: generateClientConfigMock,
    },
    async () => new SandboxBackendIdentifier('test')
  );

  await Promise.all(
    eventFactory
      .getSandboxEventHandlers({
        format: ClientConfigFormat.JS,
        appName: 'my-app',
        clientConfigOutDir: 'test-out',
      })
      .successfulDeployment.map((e) => e())
  );

  assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments, [
    { backendId: 'test', disambiguator: 'sandbox' },
    'test-out',
    'js',
  ]);
});
