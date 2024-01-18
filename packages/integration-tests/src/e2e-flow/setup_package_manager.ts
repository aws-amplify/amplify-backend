import { execa } from 'execa';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const customRegistry = 'http://localhost:4873';

// TODO: refactor into `type PackageManagerInitializer` and have sub-types with a factory.
type PackageManager = 'npm' | 'yarn-classic' | 'yarn-modern' | 'pnpm';
type PackageManagerExecutable = 'npx' | 'yarn' | 'pnpm';

const initializeNpm = async () => {
  const { stdout } = await execa('npm', ['config', 'get', 'cache']);
  const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');
  if (existsSync(npxCacheLocation)) {
    await fsp.rm(npxCacheLocation, { recursive: true });
  }
};

const initializePnpm = async () => {
  const packageManager = 'pnpm';
  await execa('npm', ['install', '-g', packageManager], {
    stdio: 'inherit',
  });
  await execa(packageManager, ['--version']);
  await execa(packageManager, ['config', 'set', 'registry', customRegistry]);
  await execa(packageManager, ['config', 'get', 'registry']);
};

const initializeYarnClassic = async (execaOptions: {
  cwd: string;
  stdio: 'inherit';
}) => {
  const packageManager = 'yarn';
  await execa('npm', ['install', '-g', packageManager], { stdio: 'inherit' });
  await execa(
    packageManager,
    ['config', 'set', 'registry', customRegistry],
    execaOptions
  );
  await execa(packageManager, ['config', 'get', 'registry'], execaOptions);
  await execa(packageManager, ['cache', 'clean'], execaOptions);
};

const initializeYarnModern = async (execaOptions: {
  cwd: string;
  stdio: 'inherit';
}) => {
  const packageManager = 'yarn';
  await execa('npm', ['install', '-g', packageManager], { stdio: 'inherit' });
  await execa('yarn', ['init', '-2'], execaOptions);
  await execa(
    packageManager,
    ['config', 'set', 'npmRegistryServer', customRegistry],
    execaOptions
  );
  await execa(
    packageManager,
    ['config', 'set', 'unsafeHttpWhitelist', 'localhost'],
    execaOptions
  );
  await execa(
    packageManager,
    ['config', 'set', 'nodeLinker', 'node-modules'],
    execaOptions
  );
  await execa(packageManager, ['cache', 'clean'], execaOptions);
};

/**
 * Sets up the package manager for the e2e flow
 */
export const setupPackageManager = async (
  dir: string
): Promise<{
  packageManager: PackageManager;
  packageManagerExecutable: PackageManagerExecutable;
}> => {
  const packageManager = (process.env.PACKAGE_MANAGER ??
    'npm') as PackageManager;
  const packageManagerExecutable = packageManager.startsWith('yarn')
    ? 'yarn'
    : packageManager === 'npm'
    ? 'npx'
    : (packageManager as PackageManagerExecutable);
  const execaOptions = {
    cwd: os.homedir(),
    stdio: 'inherit' as const,
  };

  switch (packageManager) {
    case 'npm':
      await initializeNpm();
      break;

    case 'pnpm':
      await initializePnpm();
      break;

    case 'yarn-classic':
      await initializeYarnClassic(execaOptions);
      break;

    case 'yarn-modern':
      execaOptions.cwd = dir;
      await initializeYarnModern(execaOptions);
      break;

    default:
      break;
  }

  return { packageManagerExecutable, packageManager };
};
