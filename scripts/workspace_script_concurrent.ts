import { glob } from 'glob';
import { execa } from 'execa';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

// Until npm supports concurrent workspace command execution, this can be used to run commands concurrently
// https://github.com/npm/feedback/discussions/781

// this script also uses tsconfig.tsbuildinfo hashes to determine if a package has changes before running the script in that package
// if a package does not have a tsconfig.tsbuildinfo file, or if it hashes to a different value than the last time this script ran, then the script is run in that package

const cacheFile = new URL(
  './workspace_script_concurrent_cache.json',
  import.meta.url
);
const hashCache = existsSync(cacheFile)
  ? JSON.parse(await fs.readFile(cacheFile, 'utf-8'))
  : {};

const runArgs = process.argv.slice(2);

const packagePaths = await glob('./packages/*');

const runInDir = (dir: string) =>
  execa('npm', ['run', ...runArgs], {
    cwd: dir,
    stdio: 'inherit',
  });

const runPromises = packagePaths.map(async (packagePath) => {
  const packageTsBuildInfoPath = path.join(packagePath, 'tsconfig.tsbuildinfo');
  if (!existsSync(packageTsBuildInfoPath)) {
    return runInDir(packagePath);
  }
  const packageTsBuildInfoHash = createHash('sha512')
    .update(await fs.readFile(packageTsBuildInfoPath))
    .digest('hex');
  if (hashCache[packagePath] !== packageTsBuildInfoHash) {
    await runInDir(packagePath);
  }
  hashCache[packagePath] = packageTsBuildInfoHash;
});

await Promise.all(runPromises);

await fs.writeFile(cacheFile, JSON.stringify(hashCache, null, 2));
