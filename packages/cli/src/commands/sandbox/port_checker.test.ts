import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import net from 'net';
import * as portChecker from './port_checker.js';

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
        close: mock.fn()
      };
      
      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);
      
      try {
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
        close: mock.fn()
      };
      
      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);
      
      try {
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
        close: mock.fn()
      };
      
      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);
      
      try {
        const result = await portChecker.isPortInUse(3000);
        assert.strictEqual(result, false);
      } finally {
        net.createServer = originalCreateServer;
      }
    });
  });
  
  void describe('isDevToolsRunning', () => {
    void it('checks if port 3333 is in use', async () => {
      // Instead of mocking isPortInUse, mock the net.createServer that it uses
      const mockServer = {
        once: mock.fn((event, callback) => {
          if (event === 'error') {
            callback({ code: 'EADDRINUSE' });
          }
          return mockServer;
        }),
        listen: mock.fn(),
        close: mock.fn()
      };
      
      const originalCreateServer = net.createServer;
      net.createServer = mock.fn(() => mockServer as unknown as net.Server);
      
      try {
        // Call the function under test
        const result = await portChecker.isDevToolsRunning();
        
        // Verify the result
        assert.strictEqual(result, true);
        
        // Verify that server.listen was called with port 3333
        assert.strictEqual(mockServer.listen.mock.calls.length, 1);
        assert.deepStrictEqual(mockServer.listen.mock.calls[0].arguments, [3333]);
      } finally {
        net.createServer = originalCreateServer;
      }
    });
  });
});
