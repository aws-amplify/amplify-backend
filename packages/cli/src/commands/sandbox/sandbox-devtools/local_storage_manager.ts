import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import writeFileAtomic from 'write-file-atomic';
import { BackendResourcesData } from './shared/socket_types.js';

/**
 * Represents a CloudFormation event
 */
export type CloudFormationEvent = {
  message: string;
  timestamp: string;
  resourceStatus?: {
    resourceType: string;
    resourceName: string;
    status: string;
    timestamp: string;
    key: string;
    statusReason?: string;
    eventId?: string;
  };
  isGeneric?: boolean;
};

/**
 * Represents a CloudWatch log entry
 */
export type CloudWatchLogEntry = {
  timestamp: number;
  message: string;
  logGroupName?: string;
  logStreamName?: string;
};

/**
 * Manager for local storage of sandbox data
 * Handles storing and retrieving various types of data like deployment progress, resources, logs, etc.
 */
export class LocalStorageManager {
  private readonly baseDir: string;
  private readonly cloudFormationEventsFile: string;
  private readonly resourcesFile: string;
  private readonly logsDir: string;
  private readonly cloudWatchLogsDir: string;
  private readonly resourceLoggingStateFile: string;
  private readonly settingsFile: string;
  private readonly customFriendlyNamesFile: string;
  private readonly defaultMaxLogSizeMB = 50; // Default 50MB limit
  private _maxLogSizeMB: number;

  /**
   * Creates a new LocalStorageManager
   * @param identifier Optional identifier to separate storage for different sandboxes
   * @param options Optional configuration options
   * @param options.maxLogSizeMB Optional maximum log size in MB
   */
  constructor(identifier?: string, options?: { maxLogSizeMB?: number }) {
    // Create a unique directory for this sandbox if identifier is provided
    const dirSuffix = identifier ? `-${identifier}` : '';
    this.baseDir = path.join(
      tmpdir(),
      '.amplify',
      `amplify-devtools${dirSuffix}`,
    );
    this.cloudFormationEventsFile = path.join(
      this.baseDir,
      'cloudformation-events.json',
    );

    this.resourcesFile = path.join(this.baseDir, 'resources.json');
    this.logsDir = path.join(this.baseDir, 'logs');
    this.cloudWatchLogsDir = path.join(this.baseDir, 'cloudwatch-logs');
    this.resourceLoggingStateFile = path.join(
      this.baseDir,
      'resource-logging-states.json',
    );
    this.settingsFile = path.join(this.baseDir, 'settings.json');
    this.customFriendlyNamesFile = path.join(
      this.baseDir,
      'custom-friendly-names.json',
    );

    // Log the storage paths
    printer.log(
      `LocalStorageManager: Using base directory: ${this.baseDir}`,
      LogLevel.DEBUG,
    );
    printer.log(
      `LocalStorageManager: Resources file: ${this.resourcesFile}`,
      LogLevel.DEBUG,
    );
    printer.log(
      `LocalStorageManager: CloudWatch logs directory: ${this.cloudWatchLogsDir}`,
      LogLevel.DEBUG,
    );

    // Ensure directories exist
    this.ensureDirectories();

    // Load settings or use defaults
    const settings = this.loadSettings();
    this._maxLogSizeMB =
      options?.maxLogSizeMB ||
      settings.maxLogSizeMB ||
      this.defaultMaxLogSizeMB;
    printer.log(
      `LocalStorageManager: Using max log size: ${this._maxLogSizeMB} MB`,
      LogLevel.DEBUG,
    );
  }

  /**
   * Gets the current maximum log size in MB
   */
  get maxLogSizeMB(): number {
    return this._maxLogSizeMB;
  }

  /**
   * Gets the base directory path used for storage
   * For testing purposes only
   */
  get storagePath(): string {
    return this.baseDir;
  }

  /**
   * Saves resources to a file
   * @param resources The resources to save
   */
  saveResources(resources: BackendResourcesData): void {
    try {
      writeFileAtomic.sync(
        this.resourcesFile,
        JSON.stringify(resources, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      printer.log(`Error saving resources: ${String(error)}`, LogLevel.ERROR);
    }
  }

  /**
   * Loads resources from a file
   * @returns The saved resources or null if none exist
   */
  loadResources(): BackendResourcesData | null {
    try {
      if (fs.existsSync(this.resourcesFile)) {
        const data = fs.readFileSync(this.resourcesFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      printer.log(`Error loading resources: ${String(error)}`, LogLevel.ERROR);
    }
    return null;
  }

  /**
   * Clears saved resources by deleting the resources file
   */
  clearResources(): void {
    try {
      if (fs.existsSync(this.resourcesFile)) {
        fs.unlinkSync(this.resourcesFile);
        printer.log(
          `LocalStorageManager: Cleared saved resources`,
          LogLevel.INFO,
        );
      }
    } catch (error) {
      printer.log(`Error clearing resources: ${String(error)}`, LogLevel.ERROR);
    }
  }

  /**
   * Saves console logs to a file
   * @param logs The logs to save
   * @param filename Optional filename, defaults to 'console-logs.json'
   */
  saveConsoleLogs(
    logs: Record<string, unknown>[],
    filename = 'console-logs.json',
  ): void {
    try {
      // Sanitize the filename to prevent path traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(this.logsDir, sanitizedFilename);
      writeFileAtomic.sync(filePath, JSON.stringify(logs, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      printer.log(
        `Error saving console logs: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Loads console logs from a file
   * @param filename Optional filename, defaults to 'console-logs.json'
   * @returns The saved logs or an empty array if none exist
   */
  loadConsoleLogs(filename = 'console-logs.json'): Record<string, unknown>[] {
    try {
      const filePath = path.join(this.logsDir, filename);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      printer.log(
        `Error loading console logs: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
    return [];
  }

  /**
   * Gets the current size of all logs in MB
   * @returns The total size of all logs in MB
   */
  getLogsSizeInMB(): number {
    let totalSize = 0;

    // Check base directory files
    if (fs.existsSync(this.baseDir)) {
      fs.readdirSync(this.baseDir).forEach((file) => {
        const filePath = path.join(this.baseDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          totalSize += fs.statSync(filePath).size;
        }
      });
    }

    // Check logs directory
    if (fs.existsSync(this.logsDir)) {
      fs.readdirSync(this.logsDir).forEach((file) => {
        const filePath = path.join(this.logsDir, file);
        totalSize += fs.statSync(filePath).size;
      });
    }

    // Check CloudWatch logs directory
    if (fs.existsSync(this.cloudWatchLogsDir)) {
      fs.readdirSync(this.cloudWatchLogsDir).forEach((file) => {
        const filePath = path.join(this.cloudWatchLogsDir, file);
        totalSize += fs.statSync(filePath).size;
      });
    }

    // Convert bytes to MB
    return totalSize / (1024 * 1024);
  }

  /**
   * Checks if logs exceed the maximum size limit
   * @returns True if logs exceed the size limit, false otherwise
   */
  logsExceedSizeLimit(): boolean {
    return this.getLogsSizeInMB() > this._maxLogSizeMB;
  }

  /**
   * Updates the maximum log size limit
   * @param maxSizeMB The new maximum log size in MB
   */
  setMaxLogSize(maxSizeMB: number): void {
    this._maxLogSizeMB = maxSizeMB;
    // Save the setting to a config file
    this.saveSettings({ maxLogSizeMB: this._maxLogSizeMB });
  }

  /**
   * Saves CloudWatch logs for a specific resource
   * @param resourceId The ID of the resource
   * @param logs The logs to save
   */
  saveCloudWatchLogs(resourceId: string, logs: CloudWatchLogEntry[]): void {
    try {
      // Check if logs exceed size limit before saving
      if (this.logsExceedSizeLimit()) {
        printer.log(
          `LocalStorageManager: Logs exceed size limit of ${this._maxLogSizeMB}MB, clearing oldest logs`,
          LogLevel.WARN,
        );
        this.pruneOldestLogs();
      }

      const filePath = path.join(this.cloudWatchLogsDir, `${resourceId}.json`);
      writeFileAtomic.sync(filePath, JSON.stringify(logs, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error saving CloudWatch logs for resource ${resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(
          `LocalStorageManager: Error stack: ${error.stack}`,
          LogLevel.DEBUG,
        );
      }
    }
  }

  /**
   * Loads CloudWatch logs for a specific resource
   * @param resourceId The ID of the resource
   * @returns The saved logs or an empty array if none exist
   */
  loadCloudWatchLogs(resourceId: string): CloudWatchLogEntry[] {
    try {
      const filePath = path.join(this.cloudWatchLogsDir, `${resourceId}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const logs = JSON.parse(data);
        return logs;
      }
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error loading CloudWatch logs for resource ${resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(
          `LocalStorageManager: Error stack: ${error.stack}`,
          LogLevel.ERROR,
        );
      }
    }
    return [];
  }

  /**
   * Gets a list of all resources with saved CloudWatch logs
   * @returns Array of resource IDs
   */
  getResourcesWithCloudWatchLogs(): string[] {
    try {
      if (fs.existsSync(this.cloudWatchLogsDir)) {
        const files = fs.readdirSync(this.cloudWatchLogsDir);
        const resourceIds = files
          .filter((file) => file.endsWith('.json'))
          .map((file) => file.replace('.json', ''));
        return resourceIds;
      }
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error getting resources with CloudWatch logs: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(
          `LocalStorageManager: Error stack: ${error.stack}`,
          LogLevel.DEBUG,
        );
      }
    }
    return [];
  }

  /**
   * Appends a log entry to a resource's CloudWatch logs
   * @param resourceId The ID of the resource
   * @param logEntry The log entry to append
   */
  appendCloudWatchLog(resourceId: string, logEntry: CloudWatchLogEntry): void {
    try {
      const logs = this.loadCloudWatchLogs(resourceId);
      logs.push(logEntry);
      this.saveCloudWatchLogs(resourceId, logs);
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error appending CloudWatch log for resource ${resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(
          `LocalStorageManager: Error stack: ${error.stack}`,
          LogLevel.ERROR,
        );
      }
    }
  }

  /**
   * Saves CloudFormation events to a file
   * @param events The CloudFormation events to save
   */
  saveCloudFormationEvents(events: CloudFormationEvent[]): void {
    try {
      writeFileAtomic.sync(
        this.cloudFormationEventsFile,
        JSON.stringify(events, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error saving CloudFormation events: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Loads CloudFormation events from a file
   * @returns The saved CloudFormation events or an empty array if none exist
   */
  loadCloudFormationEvents(): CloudFormationEvent[] {
    try {
      if (fs.existsSync(this.cloudFormationEventsFile)) {
        const data = fs.readFileSync(this.cloudFormationEventsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error loading CloudFormation events: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
    return [];
  }

  /**
   * Clears all CloudFormation events
   */
  clearCloudFormationEvents(): void {
    try {
      if (fs.existsSync(this.cloudFormationEventsFile)) {
        fs.unlinkSync(this.cloudFormationEventsFile);
        printer.log(
          `LocalStorageManager: Cleared CloudFormation events`,
          LogLevel.INFO,
        );
      }
    } catch (error) {
      printer.log(
        `Error clearing CloudFormation events: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Clears all stored data
   */
  clearAll(): void {
    try {
      if (fs.existsSync(this.baseDir)) {
        // Remove all files in the base directory
        fs.readdirSync(this.baseDir).forEach((file) => {
          const filePath = path.join(this.baseDir, file);
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
      }

      // Clear all files in the logs directory
      if (fs.existsSync(this.logsDir)) {
        fs.readdirSync(this.logsDir).forEach((file) => {
          const filePath = path.join(this.logsDir, file);
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
      }

      // Clear all files in the CloudWatch logs directory
      if (fs.existsSync(this.cloudWatchLogsDir)) {
        fs.readdirSync(this.cloudWatchLogsDir).forEach((file) => {
          const filePath = path.join(this.cloudWatchLogsDir, file);
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      printer.log(`Error clearing all data: ${String(error)}`, LogLevel.ERROR);
    }
  }

  /**
   * Saves the logging state for a resource
   * @param resourceId The ID of the resource
   * @param isActive Whether logging is active for this resource
   */
  saveResourceLoggingState(resourceId: string, isActive: boolean): void {
    try {
      // Load existing states
      const loggingStates = this.loadResourceLoggingStates() || {};

      // Update the state for this resource
      loggingStates[resourceId] = {
        isActive,
        lastUpdated: new Date().toISOString(),
      };
      writeFileAtomic.sync(
        this.resourceLoggingStateFile,
        JSON.stringify(loggingStates, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      printer.log(
        `Error saving resource logging state for ${resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Loads the logging states for all resources
   * @returns Record of resource IDs to their logging state
   */
  loadResourceLoggingStates(): Record<
    string,
    { isActive: boolean; lastUpdated: string }
  > | null {
    try {
      if (fs.existsSync(this.resourceLoggingStateFile)) {
        const content = fs.readFileSync(this.resourceLoggingStateFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      printer.log(
        `Error loading resource logging states: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
    return null;
  }

  /**
   * Gets the logging state for a specific resource
   * @param resourceId The ID of the resource
   * @returns The logging state or null if not found
   */
  getResourceLoggingState(
    resourceId: string,
  ): { isActive: boolean; lastUpdated: string } | null {
    const states = this.loadResourceLoggingStates();
    return states && states[resourceId] ? states[resourceId] : null;
  }

  /**
   * Gets a list of all resources with active logging
   * @returns Array of resource IDs with active logging
   */
  getResourcesWithActiveLogging(): string[] {
    const states = this.loadResourceLoggingStates();
    if (!states) return [];

    return Object.entries(states)
      .filter(([, state]) => state.isActive)
      .map(([resourceId]) => resourceId);
  }

  /**
   * Saves custom friendly names for resources
   * @param friendlyNames Map of resource IDs to custom friendly names
   */
  saveCustomFriendlyNames(friendlyNames: Record<string, string>): void {
    try {
      writeFileAtomic.sync(
        this.customFriendlyNamesFile,
        JSON.stringify(friendlyNames, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      printer.log(
        `Error saving custom friendly names: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Loads custom friendly names for resources
   * @returns Map of resource IDs to custom friendly names, or empty object if none exist
   */
  loadCustomFriendlyNames(): Record<string, string> {
    try {
      if (fs.existsSync(this.customFriendlyNamesFile)) {
        const content = fs.readFileSync(this.customFriendlyNamesFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      printer.log(
        `Error loading custom friendly names: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
    return {};
  }

  /**
   * Updates a custom friendly name for a resource
   * @param resourceId The ID of the resource
   * @param friendlyName The custom friendly name
   */
  updateCustomFriendlyName(resourceId: string, friendlyName: string): void {
    try {
      const friendlyNames = this.loadCustomFriendlyNames();
      friendlyNames[resourceId] = friendlyName;
      this.saveCustomFriendlyNames(friendlyNames);
      printer.log(
        `LocalStorageManager: Updated custom friendly name for ${resourceId}`,
        LogLevel.DEBUG,
      );
    } catch (error) {
      printer.log(
        `Error updating custom friendly name: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Removes a custom friendly name for a resource
   * @param resourceId The ID of the resource
   */
  removeCustomFriendlyName(resourceId: string): void {
    try {
      const friendlyNames = this.loadCustomFriendlyNames();
      delete friendlyNames[resourceId];
      this.saveCustomFriendlyNames(friendlyNames);
    } catch (error) {
      printer.log(
        `Error removing custom friendly name: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Ensures all required directories exist
   */
  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }

      if (!fs.existsSync(this.cloudWatchLogsDir)) {
        fs.mkdirSync(this.cloudWatchLogsDir, { recursive: true });
      }

      // Test write permissions by creating a test file
      const testFilePath = path.join(
        this.baseDir,
        'test-write-permissions.txt',
      );
      try {
        writeFileAtomic.sync(testFilePath, 'Test write permissions', {
          mode: 0o600,
        });
        printer.log(
          `LocalStorageManager: Write permissions test successful`,
          LogLevel.DEBUG,
        );

        // Clean up test file
        fs.unlinkSync(testFilePath);
      } catch (writeError) {
        printer.log(
          `LocalStorageManager: Write permissions test failed: ${String(writeError)}`,
          LogLevel.ERROR,
        );
      }
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error ensuring directories: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(
          `LocalStorageManager: Error stack: ${error.stack}`,
          LogLevel.DEBUG,
        );
      }
    }
  }

  /**
   * Saves settings to a file
   * @param settings The maximum log size in MB
   * @param settings.maxLogSizeMB The maximum log size in MB
   */
  private saveSettings(settings: { maxLogSizeMB: number }): void {
    try {
      writeFileAtomic.sync(
        this.settingsFile,
        JSON.stringify(settings, null, 2),
        { mode: 0o600 },
      );
    } catch (error) {
      printer.log(`Error saving settings: ${String(error)}`, LogLevel.ERROR);
    }
  }

  /**
   * Loads settings from a file
   * @returns The loaded settings or default settings if none exist
   */
  private loadSettings(): { maxLogSizeMB: number } {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      printer.log(`Error loading settings: ${String(error)}`, LogLevel.ERROR);
    }
    return { maxLogSizeMB: this.defaultMaxLogSizeMB };
  }

  /**
   * Prunes the oldest log files when size limit is exceeded
   */
  private pruneOldestLogs(): void {
    try {
      const logFiles: { path: string; mtime: Date }[] = [];

      if (fs.existsSync(this.cloudWatchLogsDir)) {
        fs.readdirSync(this.cloudWatchLogsDir).forEach((file) => {
          const filePath = path.join(this.cloudWatchLogsDir, file);
          const stats = fs.statSync(filePath);
          logFiles.push({ path: filePath, mtime: stats.mtime });
        });
      }

      if (fs.existsSync(this.logsDir)) {
        fs.readdirSync(this.logsDir).forEach((file) => {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          logFiles.push({ path: filePath, mtime: stats.mtime });
        });
      }

      logFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest files until we're under the limit
      for (const file of logFiles) {
        if (this.getLogsSizeInMB() <= this._maxLogSizeMB * 0.8) {
          // Remove until we're at 80% of limit
          break;
        }

        fs.unlinkSync(file.path);
      }
    } catch (error) {
      printer.log(
        `LocalStorageManager: Error pruning old logs: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }
}
