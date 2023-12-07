import { glob } from 'glob';
import { execa } from 'execa';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

// Until npm supports concurrent workspace command execution, this can be used to run commands concurrently
// https://github.com/npm/feedback/discussions/781

// this script also uses tsconfig.tsbuildinfo hashes to determine if a package has changes before running the input command in that package
// if a package does not have a tsconfig.tsbuildinfo file, or if it hashes to a different value than the last time the command ran, then the command is run in that package

/* The structure of the cache file is:
    {
      command-with-args: {
        packages/path: 'tsconfig.tsbuildinfo hash'
      }
    }
 */
const cacheFile = new URL(
  './workspace_script_concurrent_cache.json',
  import.meta.url
);

// get the existing cache, or initialize an empty cache
const hashCache = existsSync(cacheFile)
  ? JSON.parse(await fs.readFile(cacheFile, 'utf-8'))
  : {};

// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

// create a cache key from the command args
const commandCacheKey = runArgs.join('-');

// get the part of the cache relevant to this command
const commandHashCache = hashCache[commandCacheKey] || {};

const packagePaths = await glob('./packages/*');

const runInDir = (dir: string) =>
  execa('npm', ['run', ...runArgs], {
    cwd: dir,
    stdio: 'inherit',
  });

// iterate over all the packages in the project
const runPromises = packagePaths.map(async (packagePath) => {
  const packageTsBuildInfoPath = path.join(packagePath, 'tsconfig.tsbuildinfo');
  // if the package doesn't have a tsbuildinfo file, execute the command
  if (!existsSync(packageTsBuildInfoPath)) {
    return runInDir(packagePath);
  }
  const packageTsBuildInfoHash = createHash('sha512')
    .update(await fs.readFile(packageTsBuildInfoPath))
    .digest('hex');
  // if the tsbuildinfo file has a different hash than the last time the command ran, run it again
  if (commandHashCache[packagePath] !== packageTsBuildInfoHash) {
    await runInDir(packagePath);
  }
  // store the new hash in the cache
  commandHashCache[packagePath] = packageTsBuildInfoHash;
  return undefined;
});

await Promise.all(runPromises);

// set the command cache in the main cache object
hashCache[commandCacheKey] = commandHashCache;

// persist the updated cache
await fs.writeFile(cacheFile, JSON.stringify(hashCache, null, 2));
