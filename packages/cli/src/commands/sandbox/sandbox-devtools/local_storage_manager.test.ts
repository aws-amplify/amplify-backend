import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fs, { PathLike } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocalStorageManager } from './local_storage_manager.js';
import { printer } from '@aws-amplify/cli-core';

void describe('LocalStorageManager', () => {
  const mockIdentifier = 'test-backend';
  let storageManager: LocalStorageManager;
  let tempDir: string;

  beforeEach(() => {
    mock.reset();
    mock.method(printer, 'log').mock.mockImplementation(() => {});
    storageManager = new LocalStorageManager(mockIdentifier);
    tempDir = storageManager.storagePath;
  });

  afterEach(() => {
    mock.reset();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  void describe('constructor', () => {
    void it('uses default max log size if not provided', () => {
      const manager = new LocalStorageManager(mockIdentifier);
      assert.strictEqual(manager.maxLogSizeMB, 50);
    });

    void it('uses custom max log size if provided', () => {
      const manager = new LocalStorageManager(mockIdentifier, {
        maxLogSizeMB: 100,
      });
      assert.strictEqual(manager.maxLogSizeMB, 100);
    });

    void it('reset back to standard', () => {
      const manager = new LocalStorageManager(mockIdentifier, {
        maxLogSizeMB: 50,
      });
      assert.strictEqual(manager.maxLogSizeMB, 50);
    });
  });

  void describe('saveResources and loadResources', () => {
    void it('saves resources to a file', () => {
      const resources = {
        name: 'test',
        status: 'deployed',
        resources: [],
        region: 'us-east-1',
      };

      storageManager.saveResources(resources);

      assert.deepStrictEqual(storageManager.loadResources(), resources);
    });

    void it('loads resources from a file', () => {
      const mockResources = {
        name: 'test',
        status: 'deployed',
        resources: [],
        region: 'us-east-1',
      };
      storageManager.saveResources(mockResources);

      const result = storageManager.loadResources();

      assert.deepStrictEqual(result, mockResources);
    });

    void it('returns null if resources file does not exist', () => {
      const result = storageManager.loadResources();

      assert.strictEqual(result, null);
    });
  });

  void describe('clearResources', () => {
    void it('deletes the resources file if it exists', () => {
      const resources = {
        name: 'test',
        status: 'deployed',
        resources: [],
        region: 'us-east-1',
      };
      storageManager.saveResources(resources);

      storageManager.clearResources();

      assert.strictEqual(storageManager.loadResources(), null);
    });
  });

  void describe('CloudWatch logs operations', () => {
    void it('saves CloudWatch logs for a resource', () => {
      const resourceId = 'lambda-function';
      const logs = [{ timestamp: 1672531200000, message: 'Test log' }];

      storageManager.saveCloudWatchLogs(resourceId, logs);

      assert.deepStrictEqual(
        storageManager.loadCloudWatchLogs(resourceId),
        logs,
      );
    });

    void it('loads CloudWatch logs for a resource', () => {
      const resourceId = 'lambda-function';
      const mockLogs = [{ timestamp: 1672531200000, message: 'Test log' }];
      storageManager.saveCloudWatchLogs(resourceId, mockLogs);

      const result = storageManager.loadCloudWatchLogs(resourceId);

      assert.deepStrictEqual(result, mockLogs);
    });

    void it('returns empty array if CloudWatch logs file does not exist', () => {
      const result = storageManager.loadCloudWatchLogs('lambda-function');

      assert.deepStrictEqual(result, []);
    });

    void it("appends a log entry to a resource's CloudWatch logs", () => {
      const resourceId = 'lambda-function';
      const existingLogs = [
        { timestamp: 1672531200000, message: 'Existing log' },
      ];
      const newLog = { timestamp: 1672531260000, message: 'New log' };
      storageManager.saveCloudWatchLogs(resourceId, existingLogs);

      storageManager.appendCloudWatchLog(resourceId, newLog);

      const savedLogs = storageManager.loadCloudWatchLogs(resourceId);
      assert.strictEqual(savedLogs.length, 2);
      assert.deepStrictEqual(savedLogs[1], newLog);
    });

    void it('gets a list of resources with CloudWatch logs', () => {
      storageManager.saveCloudWatchLogs('lambda-function', [
        { timestamp: 1672531200000, message: 'Test log' },
      ]);
      storageManager.saveCloudWatchLogs('api-gateway', [
        { timestamp: 1672531200000, message: 'Test log' },
      ]);

      const result = storageManager.getResourcesWithCloudWatchLogs();

      assert.deepStrictEqual(result.sort(), ['api-gateway', 'lambda-function']);
    });

    void it('returns empty array if no CloudWatch logs exist', () => {
      const result = storageManager.getResourcesWithCloudWatchLogs();

      assert.deepStrictEqual(result, []);
    });
  });

  void describe('Resource logging state operations', () => {
    void it('saves resource logging state', () => {
      const resourceId = 'lambda-function';
      const isActive = true;

      storageManager.saveResourceLoggingState(resourceId, isActive);

      const state = storageManager.getResourceLoggingState(resourceId);
      assert.strictEqual(state?.isActive, true);
    });

    void it('loads resource logging states', () => {
      storageManager.saveResourceLoggingState('lambda-function', true);
      storageManager.saveResourceLoggingState('api-gateway', false);

      const result = storageManager.loadResourceLoggingStates();

      assert.strictEqual(result?.['lambda-function'].isActive, true);
      assert.strictEqual(result?.['api-gateway'].isActive, false);
    });

    void it('returns null if resource logging states file does not exist', () => {
      const result = storageManager.loadResourceLoggingStates();

      assert.strictEqual(result, null);
    });

    void it('gets resource logging state for a specific resource', () => {
      storageManager.saveResourceLoggingState('lambda-function', true);
      storageManager.saveResourceLoggingState('api-gateway', false);

      const result = storageManager.getResourceLoggingState('lambda-function');

      assert.strictEqual(result?.isActive, true);
    });

    void it('returns null if resource logging state is not found', () => {
      storageManager.saveResourceLoggingState('lambda-function', true);

      const result = storageManager.getResourceLoggingState('non-existent');

      assert.strictEqual(result, null);
    });

    void it('gets resources with active logging', () => {
      storageManager.saveResourceLoggingState('lambda-function', true);
      storageManager.saveResourceLoggingState('api-gateway', false);
      storageManager.saveResourceLoggingState('dynamodb-table', true);

      const result = storageManager.getResourcesWithActiveLogging();

      assert.deepStrictEqual(result.sort(), [
        'dynamodb-table',
        'lambda-function',
      ]);
    });
  });

  void describe('Custom friendly names operations', () => {
    void it('saves and loads custom friendly names', () => {
      const friendlyNames = {
        'lambda-function': 'My Lambda Function',
        'api-gateway': 'My API Gateway',
      };

      storageManager.saveCustomFriendlyNames(friendlyNames);
      const result = storageManager.loadCustomFriendlyNames();

      assert.deepStrictEqual(result, friendlyNames);
    });

    void it('returns empty object if custom friendly names file does not exist', () => {
      const result = storageManager.loadCustomFriendlyNames();
      assert.deepStrictEqual(result, {});
    });

    void it('updates a custom friendly name', () => {
      const existingNames = {
        'lambda-function': 'Old Name',
        'api-gateway': 'API Gateway',
      };
      storageManager.saveCustomFriendlyNames(existingNames);

      storageManager.updateCustomFriendlyName('lambda-function', 'New Name');

      const savedNames = storageManager.loadCustomFriendlyNames();
      assert.strictEqual(savedNames['lambda-function'], 'New Name');
      assert.strictEqual(savedNames['api-gateway'], 'API Gateway');
    });

    void it('removes a custom friendly name', () => {
      const existingNames = {
        'lambda-function': 'Lambda Function',
        'api-gateway': 'API Gateway',
      };
      storageManager.saveCustomFriendlyNames(existingNames);

      storageManager.removeCustomFriendlyName('lambda-function');

      const savedNames = storageManager.loadCustomFriendlyNames();
      assert.strictEqual(savedNames['lambda-function'], undefined);
      assert.strictEqual(savedNames['api-gateway'], 'API Gateway');
    });
  });

  void describe('Log size management', () => {
    void it('sets max log size', () => {
      storageManager.setMaxLogSize(90);
      assert.strictEqual(storageManager.maxLogSizeMB, 90);
    });

    void it('sets max log size (back to default)', () => {
      storageManager.setMaxLogSize(50);
      assert.strictEqual(storageManager.maxLogSizeMB, 50);
    });

    void it('calculates log size correctly using collectFileStats', () => {
      // Mock filesystem
      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock.method(fs, 'readdirSync').mock.mockImplementation(((
        dir: PathLike,
      ) => {
        const dirString = String(dir);
        if (dirString.includes('cloudwatch-logs')) return ['cw1.json'];
        if (dirString.includes('logs')) return ['log1.json', 'log2.json'];
        return ['file1.txt', 'file2.txt'];
      }) as unknown as typeof fs.readdirSync);

      const mockStat = (filePath: PathLike) => {
        const fileName = path.basename(String(filePath));
        let size = 1024; // Default 1KB

        if (fileName === 'log1.json') size = 2 * 1024 * 1024; // 2MB
        if (fileName === 'log2.json') size = 3 * 1024 * 1024; // 3MB
        if (fileName === 'cw1.json') size = 4 * 1024 * 1024; // 4MB
        if (fileName === 'file1.txt') size = 5 * 1024 * 1024; // 5MB
        if (fileName === 'file2.txt') size = 6 * 1024 * 1024; // 6MB

        return {
          size,
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
        } as unknown as fs.Stats;
      };

      mock
        .method(fs, 'statSync')
        .mock.mockImplementation(mockStat as unknown as typeof fs.statSync);

      const result = storageManager.getLogsSizeInMB();

      // Should be 2MB + 3MB + 4MB + 5MB + 6MB = 20MB (from all directories)
      assert.strictEqual(result, 20);
    });
  });

  void describe('collectFileStats', () => {
    void it('collects file information correctly', () => {
      const collectFileStats = Reflect.get(
        storageManager,
        'collectFileStats',
      ).bind(storageManager);

      // Mock file system
      const mockDate1 = new Date(2023, 0, 1);
      const mockDate2 = new Date(2023, 0, 2);

      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock
        .method(fs, 'readdirSync')
        .mock.mockImplementation((() => [
          'file1.txt',
          'file2.txt',
        ]) as unknown as typeof fs.readdirSync);

      const mockStat = (filePath: PathLike) => {
        const fileName = path.basename(String(filePath));
        return {
          size: fileName === 'file1.txt' ? 1024 : 2048,
          mtime: fileName === 'file1.txt' ? mockDate1 : mockDate2,
          isFile: () => true,
          isDirectory: () => false,
        } as unknown as fs.Stats;
      };

      mock
        .method(fs, 'statSync')
        .mock.mockImplementation(mockStat as unknown as typeof fs.statSync);

      const result = collectFileStats('/test/dir');

      assert.strictEqual(result.length, 2);
      assert.strictEqual(path.basename(result[0].path), 'file1.txt');
      assert.strictEqual(result[0].size, 1024);
      assert.strictEqual(result[0].mtime, mockDate1);
      assert.strictEqual(path.basename(result[1].path), 'file2.txt');
      assert.strictEqual(result[1].size, 2048);
      assert.strictEqual(result[1].mtime, mockDate2);
    });

    void it('handles non-existent directories', () => {
      const collectFileStats = Reflect.get(
        storageManager,
        'collectFileStats',
      ).bind(storageManager);

      mock.method(fs, 'existsSync').mock.mockImplementation(() => false);

      const result = collectFileStats('/non-existent/dir');

      assert.strictEqual(result.length, 0);
      // Verify existsSync was called with the correct path
      const existsSyncMock = fs.existsSync as unknown as ReturnType<
        typeof mock.fn
      >;
      assert.strictEqual(existsSyncMock.mock.callCount(), 1);
    });

    void it('filters out directories when onlyFiles is true', () => {
      const collectFileStats = Reflect.get(
        storageManager,
        'collectFileStats',
      ).bind(storageManager);

      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock
        .method(fs, 'readdirSync')
        .mock.mockImplementation((() => [
          'file1.txt',
          'dir1',
        ]) as unknown as typeof fs.readdirSync);

      const mockStat = (filePath: PathLike) => {
        const fileName = path.basename(String(filePath));
        const isFileValue = fileName !== 'dir1'; // dir1 is a directory

        return {
          size: 1024,
          mtime: new Date(),
          isFile: () => isFileValue,
          isDirectory: () => !isFileValue,
        } as unknown as fs.Stats;
      };

      mock
        .method(fs, 'statSync')
        .mock.mockImplementation(mockStat as unknown as typeof fs.statSync);

      const result = collectFileStats('/test/dir');

      assert.strictEqual(result.length, 1);
      assert.strictEqual(path.basename(result[0].path), 'file1.txt');
    });
  });

  void describe('Console logs operations', () => {
    void it('saves and loads console logs to/from actual files', () => {
      const logs = [{ timestamp: Date.now(), message: 'test console log' }];

      storageManager.saveConsoleLogs(logs);
      const result = storageManager.loadConsoleLogs();

      assert.deepStrictEqual(result, logs);
    });

    void it('returns empty array if console logs file does not exist', () => {
      const result = storageManager.loadConsoleLogs();
      assert.deepStrictEqual(result, []);
    });
  });

  void describe('File locations', () => {
    void it('creates files in correct base directory', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      storageManager.saveResources({
        name: 'test',
        status: 'deployed',
        resources: [],
        region: 'us-east-1',
      });

      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'resources.json')));
    });

    void it('creates subdirectories correctly', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      storageManager.saveConsoleLogs([{ message: 'test' }]);
      storageManager.saveCloudWatchLogs('test-resource', [
        { timestamp: 123, message: 'test' },
      ]);

      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'logs')));
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'cloudwatch-logs')));
      assert.ok(
        fs.existsSync(path.join(expectedBaseDir, 'logs', 'console-logs.json')),
      );
      assert.ok(
        fs.existsSync(
          path.join(expectedBaseDir, 'cloudwatch-logs', 'test-resource.csv'),
        ),
      );
    });
  });

  void describe('CloudFormation events operations', () => {
    void it('saves and loads CloudFormation events', () => {
      const events = [
        { message: 'test event', timestamp: '2023-01-01T00:00:00Z' },
      ];

      storageManager.saveCloudFormationEvents(events);
      const result = storageManager.loadCloudFormationEvents();

      assert.deepStrictEqual(result, events);
    });

    void it('creates CloudFormation events file in base directory', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      storageManager.saveCloudFormationEvents([
        { message: 'test', timestamp: '2023-01-01T00:00:00Z' },
      ]);

      assert.ok(
        fs.existsSync(path.join(expectedBaseDir, 'cloudformation-events.json')),
      );
    });
  });

  void describe('Settings file operations', () => {
    void it('creates settings file when max log size is set', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      storageManager.setMaxLogSize(100);

      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'settings.json')));
      const settingsContent = JSON.parse(
        fs.readFileSync(path.join(expectedBaseDir, 'settings.json'), 'utf8'),
      );
      assert.strictEqual(settingsContent.maxLogSizeMB, 100);
    });
  });

  void describe('pruneOldestLogs', () => {
    void it('prunes oldest log files to meet target size', () => {
      const pruneOldestLogs = Reflect.get(
        storageManager,
        'pruneOldestLogs',
      ).bind(storageManager);

      const mockDate1 = new Date(2023, 0, 1); // Oldest
      const mockDate2 = new Date(2023, 0, 2);
      const mockDate3 = new Date(2023, 0, 3);
      const mockDate4 = new Date(2023, 0, 4); // Newest

      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock.method(fs, 'readdirSync').mock.mockImplementation(((
        dir: PathLike,
      ) => {
        const dirString = String(dir);
        if (
          dirString.includes('logs') &&
          !dirString.includes('cloudwatch-logs')
        )
          return ['log1.json', 'log2.json'];
        if (dirString.includes('cloudwatch-logs'))
          return ['cw1.json', 'cw2.json'];
        return [];
      }) as unknown as typeof fs.readdirSync);

      const mockStat = (filePath: PathLike) => {
        const fileName = path.basename(String(filePath));
        let size = 0;
        let mtime = new Date();

        if (fileName === 'log1.json') {
          size = 3 * 1024 * 1024; // 3MB
          mtime = mockDate1; // Oldest
        } else if (fileName === 'log2.json') {
          size = 2 * 1024 * 1024; // 2MB
          mtime = mockDate3;
        } else if (fileName === 'cw1.json') {
          size = 4 * 1024 * 1024; // 4MB
          mtime = mockDate2;
        } else if (fileName === 'cw2.json') {
          size = 1 * 1024 * 1024; // 1MB
          mtime = mockDate4;
        }

        return {
          size,
          mtime,
          isFile: () => true,
          isDirectory: () => false,
        } as unknown as fs.Stats;
      };

      mock
        .method(fs, 'statSync')
        .mock.mockImplementation(mockStat as unknown as typeof fs.statSync);

      mock.method(fs, 'unlinkSync').mock.mockImplementation(() => {});

      Object.defineProperty(storageManager, '_maxLogSizeMB', { value: 5 }); // 5MB limit
      const filesDeleted = pruneOldestLogs();

      // Verify files deleted (should delete oldest first)
      // We have 10MB total, target is 4MB (80% of 5MB), so we need to delete at least 6MB
      // Should delete log1.json (3MB, oldest) and cw1.json (4MB, second oldest) = 7MB total
      const unlinkSyncMock = fs.unlinkSync as unknown as ReturnType<
        typeof mock.fn
      >;
      assert.strictEqual(filesDeleted, 2);
      assert.strictEqual(unlinkSyncMock.mock.callCount(), 2);

      const deletedPaths = unlinkSyncMock.mock.calls.map((call) => {
        return path.basename(call.arguments[0] as string);
      });

      assert.ok(deletedPaths.includes('log1.json')); // Oldest, should be deleted
      assert.ok(deletedPaths.includes('cw1.json')); // Second oldest, should be deleted
      assert.ok(!deletedPaths.includes('log2.json')); // Newer, should be kept
      assert.ok(!deletedPaths.includes('cw2.json')); // Newest, should be kept
    });

    void it('does not delete any files if under the size limit', () => {
      const pruneOldestLogs = Reflect.get(
        storageManager,
        'pruneOldestLogs',
      ).bind(storageManager);

      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock
        .method(fs, 'readdirSync')
        .mock.mockImplementation((() => [
          'small.json',
        ]) as unknown as typeof fs.readdirSync);
      mock.method(fs, 'statSync').mock.mockImplementation((() => {
        return {
          size: 1 * 1024 * 1024, // 1MB
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
        } as unknown as fs.Stats;
      }) as unknown as typeof fs.statSync);

      mock.method(fs, 'unlinkSync').mock.mockImplementation(() => {});

      Object.defineProperty(storageManager, '_maxLogSizeMB', { value: 10 });

      const filesDeleted = pruneOldestLogs();

      // Verify no files were deleted
      assert.strictEqual(filesDeleted, 0);
      const unlinkSyncMock = fs.unlinkSync as unknown as ReturnType<
        typeof mock.fn
      >;
      assert.strictEqual(unlinkSyncMock.mock.callCount(), 0);
    });

    void it('handles empty directories gracefully', () => {
      const pruneOldestLogs = Reflect.get(
        storageManager,
        'pruneOldestLogs',
      ).bind(storageManager);

      mock.method(fs, 'existsSync').mock.mockImplementation(() => true);
      mock
        .method(fs, 'readdirSync')
        .mock.mockImplementation(
          (() => []) as unknown as typeof fs.readdirSync,
        );
      mock.method(fs, 'unlinkSync').mock.mockImplementation(() => {});

      const filesDeleted = pruneOldestLogs();

      // Verify no files were deleted
      assert.strictEqual(filesDeleted, 0);
      const unlinkSyncMock = fs.unlinkSync as unknown as ReturnType<
        typeof mock.fn
      >;
      assert.strictEqual(unlinkSyncMock.mock.callCount(), 0);
    });
  });

  void describe('clearAll', () => {
    void it('removes all files from all directories', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      // Create all possible file types
      storageManager.saveResources({
        name: 'test',
        status: 'deployed',
        resources: [],
        region: 'us-east-1',
      });
      storageManager.saveResourceLoggingState('test-resource', true);
      storageManager.setMaxLogSize(100);
      storageManager.saveCustomFriendlyNames({
        'test-resource': 'Test Resource',
      });
      storageManager.saveCloudFormationEvents([
        { message: 'test', timestamp: '2023-01-01T00:00:00Z' },
      ]);
      storageManager.saveConsoleLogs([
        { timestamp: Date.now(), message: 'test' },
      ]);
      storageManager.saveCloudWatchLogs('lambda-function', [
        { timestamp: 1672531200000, message: 'Test log' },
      ]);

      // Verify files exist
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'resources.json')));
      assert.ok(
        fs.existsSync(
          path.join(expectedBaseDir, 'resource-logging-states.json'),
        ),
      );
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'settings.json')));
      assert.ok(
        fs.existsSync(path.join(expectedBaseDir, 'custom-friendly-names.json')),
      );
      assert.ok(
        fs.existsSync(path.join(expectedBaseDir, 'cloudformation-events.json')),
      );
      assert.ok(
        fs.existsSync(path.join(expectedBaseDir, 'logs', 'console-logs.json')),
      );
      assert.ok(
        fs.existsSync(
          path.join(expectedBaseDir, 'cloudwatch-logs', 'lambda-function.csv'),
        ),
      );

      storageManager.clearAll();

      // Verify all files are deleted
      assert.ok(!fs.existsSync(path.join(expectedBaseDir, 'resources.json')));
      assert.ok(
        !fs.existsSync(
          path.join(expectedBaseDir, 'resource-logging-states.json'),
        ),
      );
      assert.ok(!fs.existsSync(path.join(expectedBaseDir, 'settings.json')));
      assert.ok(
        !fs.existsSync(
          path.join(expectedBaseDir, 'custom-friendly-names.json'),
        ),
      );
      assert.ok(
        !fs.existsSync(
          path.join(expectedBaseDir, 'cloudformation-events.json'),
        ),
      );
      assert.ok(
        !fs.existsSync(path.join(expectedBaseDir, 'logs', 'console-logs.json')),
      );
      assert.ok(
        !fs.existsSync(
          path.join(expectedBaseDir, 'cloudwatch-logs', 'lambda-function.csv'),
        ),
      );

      // Verify directories still exist
      assert.ok(fs.existsSync(expectedBaseDir));
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'logs')));
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'cloudwatch-logs')));

      // Verify data access returns empty/null
      assert.strictEqual(storageManager.loadResources(), null);
      assert.strictEqual(storageManager.loadResourceLoggingStates(), null);
      assert.deepStrictEqual(storageManager.loadCustomFriendlyNames(), {});
      assert.deepStrictEqual(storageManager.loadCloudFormationEvents(), []);
      assert.deepStrictEqual(storageManager.loadConsoleLogs(), []);
      assert.deepStrictEqual(
        storageManager.loadCloudWatchLogs('lambda-function'),
        [],
      );
    });
  });
});
