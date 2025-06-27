import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import net from 'net';
import { PortChecker } from './port_checker.js';

void describe('port_checker', () => {
  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    mock.reset();
  });

  void describe('isPortInUse', () => {
    void it('returns true when port is in use', async () => {
      // Mock net.createServer to simulate port in use
      const mockServer = {
        once: mock.fn((event, callback) => {
          if (event === 'error') {
            callback({ code: 'EADDRINUSE' });
          }
          return mockServer;
        }),
        listen: mock.fn(),
        close: mock.fn(),
      };

      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);

      try {
        const portChecker = new PortChecker();
        const result = await portChecker.isPortInUse(3000);
        assert.strictEqual(result, true);
        assert.strictEqual(mockServer.listen.mock.calls.length, 1);
      } finally {
        net.createServer = originalCreateServer;
      }
    });

    void it('returns false when port is free', async () => {
      // Mock net.createServer to simulate free port
      const mockServer = {
        once: mock.fn((event, callback) => {
          if (event === 'listening') {
            callback();
          }
          return mockServer;
        }),
        listen: mock.fn(),
        close: mock.fn(),
      };

      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);

      try {
        const portChecker = new PortChecker();
        const result = await portChecker.isPortInUse(3000);
        assert.strictEqual(result, false);
        assert.strictEqual(mockServer.listen.mock.calls.length, 1);
        assert.strictEqual(mockServer.close.mock.calls.length, 1);
      } finally {
        net.createServer = originalCreateServer;
      }
    });

    void it('returns false on other errors', async () => {
      // Mock net.createServer to simulate other error
      const mockServer = {
        once: mock.fn((event, callback) => {
          if (event === 'error') {
            callback({ code: 'OTHER_ERROR' });
          }
          return mockServer;
        }),
        listen: mock.fn(),
        close: mock.fn(),
      };

      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);

      try {
        const portChecker = new PortChecker();
        const result = await portChecker.isPortInUse(3000);
        assert.strictEqual(result, false);
      } finally {
        net.createServer = originalCreateServer;
      }
    });
  });
});
