import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * This is a workaround for the https://github.com/npm/rfcs/issues/287.
 * The issue is causing 'bundledDependencies' functionality not working correctly.
 * Dependencies that are supposed to be bundled must be available locally
 * in node_modules under package being published.
 * The workaround prepares nested node_modules before running publish.
 */

const main = async () => {
  const tempDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), 'ai-constructs-packaging')
  );

  try {
    const packageJsonPath = path.resolve(__dirname, 'package.json');
    const packageLockPath = path.resolve(
      __dirname,
      '..',
      '..',
      'package-lock.json'
    );
    // Use current package's package.json and top level lock file.
    await fsp.copyFile(packageJsonPath, path.resolve(tempDir, 'package.json'));
    await fsp.copyFile(
      packageLockPath,
      path.resolve(tempDir, 'package-lock.json')
    );
    execSync('npm ci --omit=peer --omit=dev', { cwd: tempDir });
    await fsp.cp(
      path.resolve(tempDir, 'node_modules'),
      path.resolve(__dirname, 'node_modules'),
      { recursive: true }
    );
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
};

void main();
