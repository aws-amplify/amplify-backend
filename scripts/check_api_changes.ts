import { glob } from 'glob';
import path from 'path';
import { existsSync } from 'fs';
import { ApiChangesValidator } from './components/api-changes-validator/api_changes_validator.js';
import { fileURLToPath } from 'url';

// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

let [baselineRepositoryPath, workingDirectory] = runArgs;

if (!baselineRepositoryPath || !workingDirectory) {
  throw new Error(
    'Usage: tsx scripts/check_api_changes.ts <baselineRepositoryPath> <workingDirectory>'
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

const packagePaths = (await glob(`${latestRepositoryPath}/packages/*`)).filter(
  (item) => true || item.endsWith('plugin-types')
);
for (const packagePath of packagePaths) {
  const packageName = path.basename(packagePath);
  const baselinePackagePath = path.join(
    baselineRepositoryPath,
    'packages',
    packageName
  );
  const baselinePackageApiReportPath = path.join(baselinePackagePath, 'API.md');
  if (!existsSync(baselinePackageApiReportPath)) {
    console.log(
      `Skipping ${packageName} as it does not have baseline API.md file`
    );
    continue;
  }

  console.log(`Validating API changes of ${packageName}`);
  await new ApiChangesValidator(
    packagePath,
    baselinePackageApiReportPath,
    workingDirectory
  ).validate();
}
