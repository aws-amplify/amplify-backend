import { glob } from 'glob';
import path from 'path';
import { existsSync } from 'fs';
import { ApiChangesValidator } from './components/api-changes-validator/api_changes_validator.js';
import { fileURLToPath } from 'url';
import { runLocalPublish } from './components/local_publish_runner.js';
import { execa } from 'execa';

/**
 * This scripts checks whether current (aka latest) repository content
 * introduces compile time breaking changes in exported APIs.
 *
 * In order to debug this check locally:
 * 1. Checkout content of your PR
 * 2. Build and publish packages locally, i.e. 'npm run build && npm run vend'
 * 3. Checkout content of your PR's base branch to different directory
 * 4. Create a directory where test projects are going to be generated
 * 5. Run 'tsx scripts/check_api_changes.ts <baselineBranchPath> <workingDirectory>'
 */

// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

let [baselineRepositoryPath, workingDirectory] = runArgs;

if (!baselineRepositoryPath || !workingDirectory) {
  throw new Error(
    'Usage: tsx scripts/check_api_changes.ts <baselineBranchPath> <workingDirectory>'
  );
}

if (!path.isAbsolute(baselineRepositoryPath)) {
  baselineRepositoryPath = path.resolve(baselineRepositoryPath);
}

if (!path.isAbsolute(workingDirectory)) {
  workingDirectory = path.resolve(workingDirectory);
}

const latestRepositoryPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

console.log(
  `Validating API changes between latest ${latestRepositoryPath} and baseline ${baselineRepositoryPath}`
);

const packagePaths = await glob(`${latestRepositoryPath}/packages/*`);

await execa('npm', ['run', 'vend'], {
  stdio: 'inherit',
  cwd: latestRepositoryPath,
});
await runLocalPublish(async () => {
  await Promise.all(
    packagePaths.map(async (packagePath) => {
      const packageName = path.basename(packagePath);
      const baselinePackagePath = path.join(
        baselineRepositoryPath,
        'packages',
        packageName
      );
      const baselinePackageApiReportPath = path.join(
        baselinePackagePath,
        'API.md'
      );
      if (!existsSync(baselinePackageApiReportPath)) {
        console.log(
          `Skipping ${packageName} as it does not have baseline API.md file`
        );
        return;
      }

      console.log(`Validating API changes of ${packageName}`);
      await new ApiChangesValidator(
        packagePath,
        baselinePackageApiReportPath,
        workingDirectory
      ).validate();
      console.log(`Validation of ${packageName} completed successfully`);
    })
  );
});
