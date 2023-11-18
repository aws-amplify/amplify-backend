import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { ConfigurationController } from './local_configuration_controller_factory';

/**
 * Used to interact with config file based on OS.
 */
export class LocalConfigurationController implements ConfigurationController {
  dirPath: string;
  configFilePath: string;
  _store: Record<string, unknown>;

  /**
   * Initializes paths to project config dir & config file.
   */
  constructor(
    private readonly projectName = 'amplify',
    private readonly configFileName = 'config.json'
  ) {
    this.dirPath = this.getConfigDirPath(this.projectName);
    this.configFilePath = path.join(this.dirPath, this.configFileName);
  }

  /**
   * Getter for cached config, retrieves config from disk if not cached already.
   * If the store is not cached & config file does not exist, it will create a blank one.
   */
  private async store(): Promise<Record<string, unknown>> {
    if (this._store) {
      return this._store;
    }
    try {
      // check if file exists & readable.
      await fs.access(
        this.configFilePath,
        fs.constants.F_OK | fs.constants.R_OK
      );
      const fileContent = await fs.readFile(this.configFilePath, 'utf-8');
      this._store = JSON.parse(fileContent);
    } catch {
      this._store = {};
      await this.write();
    }
    return this._store;
  }

  /**
   * Creates project directory to store config if it doesn't exist yet.
   */
  private mkConfigDir() {
    return fs.mkdir(this.dirPath, { recursive: true });
  }

  /**
   * Gets values from cached config by path.
   */
  async get<T>(path: string) {
    return path
      .split('.')
      .reduce((acc: Record<string, unknown>, current: string) => {
        return acc?.[current] as Record<string, unknown>;
      }, await this.store()) as T;
  }

  /**
   * Set value by path & update config file to disk.
   */
  async set(path: string, value: string | boolean | number) {
    let current: Record<string, unknown> = await this.store();

    path.split('.').forEach((key, index, keys) => {
      if (index === keys.length - 1) {
        current[key] = value;
      } else {
        if (current[key] == null) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
    });

    await this.write();
  }

  /**
   * Writes config file to disk if found.
   */
  async write() {
    // creates project directory if it doesn't exist.
    await this.mkConfigDir();

    const output = JSON.stringify(this._store ? this._store : {});
    await fs.writeFile(this.configFilePath, output, 'utf8');
  }

  /**
   * Reset cached config and delete the config file.
   */
  async clear() {
    this._store = {};
    await fs.rm(this.configFilePath);
  }

  /**
   * Returns the path to config directory depending on OS
   */
  private getConfigDirPath(name: string): string {
    const homedir = os.homedir();

    const macos = () => path.join(homedir, 'Library', 'Preferences', name);
    const windows = () => {
      return path.join(
        process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming'),
        name,
        'Config'
      );
    };
    const linux = () => {
      return path.join(
        process.env.XDG_STATE_HOME || path.join(homedir, '.local', 'state'),
        name
      );
    };

    switch (process.platform) {
      case 'darwin':
        return macos();
      case 'win32':
        return windows();
      default:
        return linux();
    }
  }
}
