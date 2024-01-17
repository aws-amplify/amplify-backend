import { execa } from 'execa';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

type PackageManager = 'npm' | 'yarn-classic' | 'yarn-modern' | 'pnpm';
type PackageManagerExecutable = 'npx' | 'yarn' | 'pnpm';
/**
 * Sets up the package manager for the e2e flow
 */
export const setupPackageManager = async (
  dir: string
): Promise<{
  packageManager: PackageManager;
  packageManagerExecutable: PackageManagerExecutable;
}> => {
  const packageManager = (process.env.PACKAGE_MANAGER_EXECUTABLE ??
    'npm') as PackageManager;
  const packageManagerExecutable = packageManager.startsWith('yarn')
    ? 'yarn'
    : packageManager === 'npm'
    ? 'npx'
    : (packageManager as PackageManagerExecutable);
  const execaOptions = {
    cwd: packageManager === 'yarn-modern' ? dir : os.homedir(),
    stdio: 'inherit' as const,
  };

  if (packageManager === 'npm') {
    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }
  } else if (packageManager.startsWith('yarn')) {
    if (packageManager === 'yarn-modern') {
      await execa('corepack', ['enable'], execaOptions);
      await execa('yarn', ['init', '-2'], execaOptions);

      await execa(
        'yarn',
        ['config', 'set', 'npmRegistryServer', 'http://localhost:4873'],
        execaOptions
      );
      await execa(
        'yarn',
        ['config', 'set', 'unsafeHttpWhitelist', 'localhost'],
        execaOptions
      );
      await execa(
        'yarn',
        ['config', 'set', 'nodeLinker', 'node-modules'],
        execaOptions
      );
    } else {
      await execa('npm', ['install', '-g', 'yarn'], { stdio: 'inherit' });
      await execa(
        'yarn',
        ['config', 'set', 'registry', 'http://localhost:4873'],
        execaOptions
      );
      await execa('yarn', ['config', 'get', 'registry'], execaOptions);
    }
    await execa('yarn', ['cache', 'clean'], execaOptions);
  } else if (packageManager === 'pnpm') {
    await execa('npm', ['install', '-g', packageManager], {
      stdio: 'inherit',
    });
    await execa(packageManager, ['--version']);
    await execa(packageManager, [
      'config',
      'set',
      'registry',
      'http://localhost:4873',
    ]);
    await execa(packageManager, ['config', 'get', 'registry']);
  }

  return { packageManagerExecutable, packageManager };
};
