import { ClientConfigFormat } from '@aws-amplify/client-config';
import {
  AmplifyFault,
  AmplifyUserError,
  UsageDataEmitter,
} from '@aws-amplify/platform-core';
import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'node:path';
import { format, printer } from '@aws-amplify/cli-core';

void describe('sandbox_event_handler_factory', () => {
  // client config mocks
  const generateClientConfigMock =
    mock.fn<ClientConfigGeneratorAdapter['generateClientConfigToFile']>();
  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: generateClientConfigMock,
  } as unknown as ClientConfigGeneratorAdapter;
  const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
    clientConfigGeneratorAdapterMock,
    '0',
    'test-out',
    ClientConfigFormat.MJS
  );

  // Usage data emitter mocks
  const emitSuccessMock = mock.fn();
  const emitFailureMock = mock.fn();
  const usageDataEmitterMock = {
    emitSuccess: emitSuccessMock,
    emitFailure: emitFailureMock,
  } as unknown as UsageDataEmitter;

  const printMock = mock.method(printer, 'print');

  // Class under test
  const eventFactory = new SandboxEventHandlerFactory(
    async () => ({
      namespace: 'test',
      name: 'name',
      type: 'sandbox',
    }),
    async () => usageDataEmitterMock
  );

  afterEach(() => {
    emitSuccessMock.mock.resetCalls();
    emitFailureMock.mock.resetCalls();
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
          e({ deploymentTimes: { synthesisTime: 2, totalTime: 10 } })
        )
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: 'test',
        name: 'name',
      },
      '0',
      'test-out',
      'mjs',
    ]);

    assert.strictEqual(emitSuccessMock.mock.callCount(), 1);
    assert.strictEqual(emitFailureMock.mock.callCount(), 0);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[0], {
      synthesisTime: 2,
      totalTime: 10,
    });
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'Sandbox',
    });
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
        .failedDeployment.map((e) => e(testError))
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.callCount(), 0);
    assert.strictEqual(emitSuccessMock.mock.callCount(), 0);
    assert.strictEqual(emitFailureMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      emitFailureMock.mock.calls[0].arguments[0],
      testError
    );
    assert.deepStrictEqual(emitFailureMock.mock.calls[0].arguments[1], {
      command: 'Sandbox',
    });
  });

  void it('calls the usage emitter on the failedDeployment event with generic Error', async () => {
    const testError = new Error('Some generic error');
    await Promise.all(
      eventFactory
        .getSandboxEventHandlers({
          sandboxIdentifier: 'my-app',
          clientConfigLifecycleHandler,
        })
        .failedDeployment.map((e) => e(testError))
    );

    assert.deepStrictEqual(generateClientConfigMock.mock.callCount(), 0);
    assert.strictEqual(emitSuccessMock.mock.callCount(), 0);
    assert.strictEqual(emitFailureMock.mock.callCount(), 1);

    const expectedError = new AmplifyFault(
      'UnknownFault',
      {
        message: 'Error: Some generic error',
      },
      testError
    );
    assert.deepStrictEqual(
      emitFailureMock.mock.calls[0].arguments[0].name,
      expectedError.name
    );
    assert.deepStrictEqual(
      emitFailureMock.mock.calls[0].arguments[0].message,
      expectedError.message
    );
    assert.deepStrictEqual(
      emitFailureMock.mock.calls[0].arguments[0].classification,
      expectedError.classification
    );
    assert.deepStrictEqual(
      emitFailureMock.mock.calls[0].arguments[0].cause.message,
      expectedError.cause?.message
    );
    assert.deepStrictEqual(emitFailureMock.mock.calls[0].arguments[1], {
      command: 'Sandbox',
    });
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
        .successfulDeployment.map((e) => e())
    );

    assert.deepStrictEqual(
      printMock.mock.calls[0].arguments[0],
      format.error('Amplify configuration could not be generated.')
    );

    assert.deepStrictEqual(
      printMock.mock.calls[1].arguments[0],
      format.error('test error message')
    );

    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: 'test',
        name: 'name',
      },
      '0',
      'test-out',
      'mjs',
    ]);

    // No metrics emitted
    assert.strictEqual(emitSuccessMock.mock.callCount(), 0);
    assert.strictEqual(emitFailureMock.mock.callCount(), 0);
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
        .successfulDeletion.map((e) => e())
    );

    assert.strictEqual(fspMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      fspMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'test-out', 'amplifyconfiguration.mjs')
    );

    // No metrics emitted as of now
    assert.strictEqual(emitSuccessMock.mock.callCount(), 0);
    assert.strictEqual(emitFailureMock.mock.callCount(), 0);
  });
});
