import os from 'os';
import path from 'path';

/**
 * Returns the path to config directory depending on OS
 */
export const getConfigDirPath = (): string => {
  const amplifyConfigDirName = 'amplify';
  const homedir = os.homedir();

  const macos = () =>
    path.join(homedir, 'Library', 'Preferences', amplifyConfigDirName);
  const windows = () => {
    return path.join(
      process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming'),
      amplifyConfigDirName,
      'Config',
    );
  };
  const linux = () => {
    return path.join(
      process.env.XDG_STATE_HOME || path.join(homedir, '.local', 'state'),
      amplifyConfigDirName,
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
