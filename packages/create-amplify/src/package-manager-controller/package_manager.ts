export type PackageManagerName =
  | 'npm'
  | 'yarn-classic'
  | 'yarn-modern'
  | 'pnpm';
type PackageManagerExecutable = 'npm' | 'yarn' | 'pnpm';
type PackageManagerBinaryRunner = 'npx' | 'yarn' | 'pnpm';
type PackageManagerInstallCommand = 'install' | 'add';
type PackageManagerLockFile =
  | 'package-lock.json'
  | 'yarn.lock'
  | 'pnpm-lock.yaml';
type PackageManagerInitDefault = Readonly<string[]>;
export type PackageManager = {
  name: PackageManagerName;
  executable: PackageManagerExecutable;
  binaryRunner: PackageManagerBinaryRunner;
  installCommand: PackageManagerInstallCommand;
  lockFile: PackageManagerLockFile;
  initDefault: PackageManagerInitDefault;
};
export type PackageManagers = {
  [key in PackageManagerName]: PackageManager;
};

/**
 * getPackageManager config
 */
export const getPackageManagerFactory = (
  packageManagerName: PackageManagerName
) => {
  const packageManagers: PackageManagers = {
    npm: {
      name: 'npm',
      executable: 'npm',
      binaryRunner: 'npx',
      installCommand: 'install',
      lockFile: 'package-lock.json',
      initDefault: ['init', '--yes'],
    },
    'yarn-classic': {
      name: 'yarn-classic',
      executable: 'yarn',
      binaryRunner: 'yarn',
      installCommand: 'add',
      lockFile: 'yarn.lock',
      initDefault: ['init', '--yes'],
    },
    'yarn-modern': {
      name: 'yarn-modern',
      executable: 'yarn',
      binaryRunner: 'yarn',
      installCommand: 'add',
      lockFile: 'yarn.lock',
      initDefault: ['init', '--yes'],
    },
    pnpm: {
      name: 'pnpm',
      executable: 'pnpm',
      binaryRunner: 'pnpm',
      installCommand: 'add',
      lockFile: 'pnpm-lock.yaml',
      initDefault: ['init'],
    },
  } as const;

  if (!packageManagers[packageManagerName]) {
    throw new Error(
      `${packageManagerName} is not a supported package manager.`
    );
  }

  return packageManagers[packageManagerName];
};
