import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
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
      const resources = { name: 'test', resources: [{ id: '1' }] };

      storageManager.saveResources(resources);

      assert.deepStrictEqual(storageManager.loadResources(), resources);
    });

    void it('loads resources from a file', () => {
      const mockResources = { name: 'test', resources: [{ id: '1' }] };
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
      const resources = { name: 'test', resources: [{ id: '1' }] };
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

  void describe('Deployment progress operations', () => {
    void it('saves and loads deployment progress events to/from actual files', () => {
      const events = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          eventType: 'CREATE_IN_PROGRESS',
          message: 'CREATE_IN_PROGRESS',
        },
        {
          timestamp: '2023-01-01T00:01:00Z',
          eventType: 'CREATE_COMPLETE',
          message: 'CREATE_COMPLETE',
        },
      ];

      storageManager.saveDeploymentProgress(events);
      const result = storageManager.loadDeploymentProgress();

      assert.deepStrictEqual(result, events);
    });

    void it('returns empty array if deployment progress file does not exist', () => {
      const result = storageManager.loadDeploymentProgress();
      assert.deepStrictEqual(result, []);
    });

    void it('appends deployment progress event to actual file', () => {
      const existingEvents = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          eventType: 'CREATE_IN_PROGRESS',
          message: 'CREATE_IN_PROGRESS',
        },
      ];
      const newEvent = {
        timestamp: '2023-01-01T00:01:00Z',
        eventType: 'CREATE_COMPLETE',
        message: 'CREATE_COMPLETE',
      };

      storageManager.saveDeploymentProgress(existingEvents);
      storageManager.appendDeploymentProgressEvent(newEvent);
      const savedEvents = storageManager.loadDeploymentProgress();

      assert.strictEqual(savedEvents.length, 2);
      assert.deepStrictEqual(savedEvents[1], newEvent);
    });

    void it('clears deployment progress from actual file', () => {
      const events = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          eventType: 'CREATE_IN_PROGRESS',
          message: 'CREATE_IN_PROGRESS',
        },
      ];

      storageManager.saveDeploymentProgress(events);
      storageManager.clearDeploymentProgress();

      assert.deepStrictEqual(storageManager.loadDeploymentProgress(), []);
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

      storageManager.saveResources({ test: 'data' });

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
          path.join(expectedBaseDir, 'cloudwatch-logs', 'test-resource.json'),
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

  void describe('clearAll', () => {
    void it('removes all files from all directories', () => {
      const expectedBaseDir = path.join(
        os.tmpdir(),
        '.amplify',
        'amplify-devtools-test-backend',
      );

      // Create all possible file types
      storageManager.saveResources({ test: 'data' });
      storageManager.saveDeploymentProgress([
        {
          timestamp: '2023-01-01T00:00:00Z',
          eventType: 'CREATE_IN_PROGRESS',
          message: 'test',
        },
      ]);
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
        fs.existsSync(path.join(expectedBaseDir, 'deployment-progress.json')),
      );
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
          path.join(expectedBaseDir, 'cloudwatch-logs', 'lambda-function.json'),
        ),
      );

      storageManager.clearAll();

      // Verify all files are deleted
      assert.ok(!fs.existsSync(path.join(expectedBaseDir, 'resources.json')));
      assert.ok(
        !fs.existsSync(path.join(expectedBaseDir, 'deployment-progress.json')),
      );
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
          path.join(expectedBaseDir, 'cloudwatch-logs', 'lambda-function.json'),
        ),
      );

      // Verify directories still exist
      assert.ok(fs.existsSync(expectedBaseDir));
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'logs')));
      assert.ok(fs.existsSync(path.join(expectedBaseDir, 'cloudwatch-logs')));

      // Verify data access returns empty/null
      assert.strictEqual(storageManager.loadResources(), null);
      assert.deepStrictEqual(storageManager.loadDeploymentProgress(), []);
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
