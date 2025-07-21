import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ShutdownService } from './shutdown_service.js';
import { printer } from '@aws-amplify/cli-core';
import type { Server } from 'socket.io';
import type { LocalStorageManager } from '../local_storage_manager.js';
import type { Sandbox } from '@aws-amplify/sandbox';
import type { Server as HttpServer } from 'node:http';

// Define the return type of mock.fn()
type MockFn = ReturnType<typeof mock.fn>;

void describe('ShutdownService', () => {
  let service: ShutdownService;
  let mockIo: Server;
  let mockServer: HttpServer;
  let mockStorageManager: LocalStorageManager;
  let mockSandbox: Sandbox;

  beforeEach(() => {
    mock.reset();
    mock.method(printer, 'print');
    mock.method(printer, 'log');

    mockIo = {
      emit: mock.fn(),
      close: mock.fn(() => Promise.resolve()),
    } as unknown as Server;

    mockServer = {
      close: mock.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    } as unknown as HttpServer;

    mockStorageManager = {
      clearAll: mock.fn(),
    } as unknown as LocalStorageManager;
    mockSandbox = { stop: mock.fn() } as unknown as Sandbox;

    service = new ShutdownService(
      mockIo,
      mockServer,
      mockStorageManager,
      mockSandbox,
      async () => 'running',
      printer,
    );
  });

  void describe('shutdown', () => {
    void it('stops running sandbox and clears storage', async () => {
      await service.shutdown('SIGINT', false);

      assert.strictEqual(
        (mockSandbox.stop as unknown as MockFn).mock.callCount(),
        1,
      );
      assert.strictEqual(
        (mockStorageManager.clearAll as unknown as MockFn).mock.callCount(),
        1,
      );
      assert.strictEqual(
        (mockIo.close as unknown as MockFn).mock.callCount(),
        1,
      );
      assert.strictEqual(
        (mockServer.close as unknown as MockFn).mock.callCount(),
        1,
      );
    });

    void it('skips sandbox stop when not running', async () => {
      const stoppedService = new ShutdownService(
        mockIo,
        mockServer,
        mockStorageManager,
        mockSandbox,
        async () => 'stopped',
        printer,
      );

      await stoppedService.shutdown('SIGTERM', false);

      assert.strictEqual(
        (mockSandbox.stop as unknown as MockFn).mock.callCount(),
        0,
      );
      assert.strictEqual(
        (mockStorageManager.clearAll as unknown as MockFn).mock.callCount(),
        1,
      );
    });

    void it('handles sandbox stop errors', async () => {
      (mockSandbox.stop as unknown as MockFn).mock.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      await service.shutdown('user request', false);

      assert.strictEqual(
        (mockSandbox.stop as unknown as MockFn).mock.callCount(),
        1,
      );
      assert.strictEqual(
        (mockStorageManager.clearAll as unknown as MockFn).mock.callCount(),
        1,
      );
    });
  });
});
