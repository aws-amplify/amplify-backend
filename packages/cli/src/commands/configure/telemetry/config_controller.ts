import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Used to interact with config file based on OS.
 */
export class ConfigController {
  dirPath: string;
  configFilePath: string;
  _store: Record<string, unknown>;

  /**
   * Initializes common paths to telemetry configs.
   */
  constructor(
    private readonly projectName = 'amplify',
    private readonly configFileName = 'config.json'
  ) {
    this.dirPath = this.getConfigPath(this.projectName);
    this.configFilePath = path.join(this.dirPath, this.configFileName);
  }

  /**
   * Getter for cached config, retrieves config from disk if not cached already.
   * If the store is not cached & config file does not exist, it will create a blank one.
   */
  private get store(): Record<string, unknown> {
    if (this._store) {
      return this._store;
    }
    if (fs.existsSync(this.configFilePath)) {
      this._store = JSON.parse(fs.readFileSync(this.configFilePath).toString());
    } else {
      this._store = {};
      this.write();
    }
    return this._store;
  }

  /**
   * Creates project directory to store config if it doesn't exist yet.
   */
  private mkConfigDir() {
    fs.mkdirSync(this.dirPath, { recursive: true });
  }

  /**
   * Gets values from cached config by path.
   */
  get(path: string) {
    return path
      .split('.')
      .reduce((acc: Record<string, unknown>, current: string) => {
        return acc?.[current] as Record<string, unknown>;
      }, this.store);
  }

  /**
   * Set value by path & update config file to disk.
   */
  set(path: string, value: string | boolean | number, writeToFile = true) {
    let current: Record<string, unknown> = this._store || this.store;

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

    if (writeToFile) {
      this.write();
    }
  }

  /**
   * Writes config file to disk if found.
   */
  write() {
    // creates project directory if it doesn't exist.
    this.mkConfigDir();

    const output = JSON.stringify(this._store ? this._store : {});
    fs.writeFileSync(this.configFilePath, output);
  }

  /**
   * Reset cached config and delete the config file.
   */
  clear() {
    this._store = {};
    fs.rmSync(this.configFilePath);
  }

  /**
   * Returns the path to config directory depending on OS
   */
  getConfigPath(name: string): string {
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
