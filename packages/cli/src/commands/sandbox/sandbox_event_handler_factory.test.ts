import { ClientConfigFormat } from '@aws-amplify/client-config';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'node:path';
import { format, printer } from '@aws-amplify/cli-core';
import { NoticesRenderer } from '../../notices/notices_renderer.js';

void describe('sandbox_event_handler_factory', () => {
  // client config mocks
  const generateClientConfigMock =
    mock.fn<ClientConfigGeneratorAdapter['generateClientConfigToFile']>();
  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: generateClientConfigMock,
  } as unknown as ClientConfigGeneratorAdapter;
  const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
    clientConfigGeneratorAdapterMock,
    '1.4',
    'test-out',
    ClientConfigFormat.JSON,
  );

  const printMock = mock.method(printer, 'print');

  const tryFindAndPrintApplicableNoticesMock = mock.fn();
  const noticesRenderer = {
    tryFindAndPrintApplicableNotices: tryFindAndPrintApplicableNoticesMock,
  } as unknown as NoticesRenderer;

  // Class under test
  const eventFactory = new SandboxEventHandlerFactory(
    async () => ({
      namespace: 'test',
      name: 'name',
      type: 'sandbox',
    }),
    noticesRenderer,
  );

  afterEach(() => {
    printMock.mock.resetCalls();
    generateClientConfigMock.mock.resetCalls();
  });

  void it('calls the client config adapter and usage emitter on the successfulDeployment event', async () => {
    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .successfulDeployment.map((e) =>
          e({ deploymentTimes: { synthesisTime: 2, totalTime: 10 } }),
        ),
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: 'test',
        name: 'name',
      },
      '1.4',
      'test-out',
      'json',
    ]);
  });

  void it('calls the usage emitter on the failedDeployment event with AmplifyError', async () => {
    const testError = new AmplifyUserError('BackendBuildError', {
      message: 'test message',
      resolution: 'test resolution',
    });
    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .failedDeployment.map((e) => e(testError)),
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('calls the usage emitter on the failedDeployment event with generic Error', async () => {
    const testError = new Error('Some generic error');
    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .failedDeployment.map((e) => e(testError)),
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('does not throw when client config adapter fails on the successfulDeployment event', async () => {
    generateClientConfigMock.mock.mockImplementationOnce(() => {
      throw new Error('test error message');
    });

    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .successfulDeployment.map((e) => e()),
    );

    assert.deepStrictEqual(
      printMock.mock.calls[0].arguments[0],
      `${format.error(
        'Amplify outputs could not be generated.',
      )} ${format.error(new Error('test error message'))}`,
    );

    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: 'test',
        name: 'name',
      },
      '1.4',
      'test-out',
      'json',
    ]);
  });

  void it('calls deleteClientConfigFile on client config adapter on the successfulDeletion event', async () => {
    mock.method(fs, 'lstatSync', () => {
      return { isFile: () => false, isDir: () => true };
    });

    const fspMock = mock.method(fsp, 'rm', () => Promise.resolve());

    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .successfulDeletion.map((e) => e()),
    );

    assert.strictEqual(fspMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      fspMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'test-out', 'amplify_outputs.json'),
    );
  });
});
