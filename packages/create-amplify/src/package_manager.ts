import {
  NpmProjectInitializer,
  PnpmProjectInitializer,
  YarnClassicProjectInitializer,
  YarnModernProjectInitializer,
} from './project-initializer/index.js';
import {
  NpmPackageManagerController,
  PnpmPackageManagerController,
  YarnClassicPackageManagerController,
  YarnModernPackageManagerController,
} from './package-manager-controller/index.js';

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
type PackageManagerInitDefault = ['init', '--yes'] | ['init'];
export type PackageManager = {
  name: PackageManagerName;
  executable: PackageManagerExecutable;
  binaryRunner: PackageManagerBinaryRunner;
  installCommand: PackageManagerInstallCommand;
  lockFile: PackageManagerLockFile;
  initDefault: PackageManagerInitDefault;
  projectInitializer:
    | typeof NpmProjectInitializer
    | typeof YarnClassicProjectInitializer
    | typeof YarnModernProjectInitializer
    | typeof PnpmProjectInitializer;
  packageManagerController:
    | typeof NpmPackageManagerController
    | typeof YarnClassicPackageManagerController
    | typeof YarnModernPackageManagerController
    | typeof PnpmPackageManagerController;
};
export type PackageManagers = {
  [key in PackageManagerName]: PackageManager;
};
export const packageManagers: PackageManagers = {
  npm: {
    name: 'npm',
    executable: 'npm',
    binaryRunner: 'npx',
    installCommand: 'install',
    lockFile: 'package-lock.json',
    initDefault: ['init', '--yes'],
    projectInitializer: NpmProjectInitializer,
    packageManagerController: NpmPackageManagerController,
  },
  'yarn-classic': {
    name: 'yarn-classic',
    executable: 'yarn',
    binaryRunner: 'yarn',
    installCommand: 'add',
    lockFile: 'yarn.lock',
    initDefault: ['init', '--yes'],
    projectInitializer: YarnClassicProjectInitializer,
    packageManagerController: YarnClassicPackageManagerController,
  },
  'yarn-modern': {
    name: 'yarn-modern',
    executable: 'yarn',
    binaryRunner: 'yarn',
    installCommand: 'add',
    lockFile: 'yarn.lock',
    initDefault: ['init', '--yes'],
    projectInitializer: YarnModernProjectInitializer,
    packageManagerController: YarnModernPackageManagerController,
  },
  pnpm: {
    name: 'pnpm',
    executable: 'pnpm',
    binaryRunner: 'pnpm',
    installCommand: 'add',
    lockFile: 'pnpm-lock.yaml',
    initDefault: ['init'],
    projectInitializer: PnpmProjectInitializer,
    packageManagerController: PnpmPackageManagerController,
  },
} as const;
