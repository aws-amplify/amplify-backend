import os from 'os';
import path from 'path';

/**
 * Returns the path to config directory depending on OS
 */
export const getConfigDirPath = (name: string): string => {
  const homedir = os.homedir();

  const macos = () => path.join(homedir, 'Library', 'Preferences', name);
  const windows = () => {
    return path.join(
      process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming'),
      name,
      'Config',
    );
  };
  const linux = () => {
    return path.join(
      process.env.XDG_STATE_HOME || path.join(homedir, '.local', 'state'),
      name,
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
};
