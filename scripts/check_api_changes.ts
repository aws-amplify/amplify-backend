import { glob } from 'glob';
import path from 'path';
import { existsSync } from 'fs';
import { ApiChangesValidator } from './components/api-changes-validator/api_changes_validator.js';

// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

const latestRepositoryPath = runArgs[0];
const baselineRepositoryPath = runArgs[1];
const workingDirectory = runArgs[2];

if (!latestRepositoryPath || !baselineRepositoryPath || !workingDirectory) {
  throw new Error(
    'Usage: tsx scripts/check_api_changes.ts <latestRepositoryPath> <baselineRepositoryPath> <workingDirectory>'
  );
}

console.log(
  `Validating API changes between latest ${latestRepositoryPath} and baseline ${baselineRepositoryPath}`
);

const packagePaths = (await glob(`${latestRepositoryPath}/packages/*`)).filter(
  (item) => item.endsWith('client-config')
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
    packageName,
    baselinePackageApiReportPath,
    packagePath,
    workingDirectory
  ).validate();
}
