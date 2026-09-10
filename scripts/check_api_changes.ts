import { glob } from 'glob';
import path from 'path';
import { existsSync } from 'fs';
import { ApiChangesValidator } from './components/api-changes-validator/api_changes_validator.js';
import { fileURLToPath } from 'url';

/**
 * This scripts checks whether current (aka latest) repository content
 * introduces compile time breaking changes in exported APIs.
 *
 * In order to debug this check locally:
 * 1. Checkout content of your PR
 * 2. Build and publish packages locally, i.e. 'npm run build && npm run start:npm-proxy && npm run publish:local -- --keepGitDiff'
 * 3. Checkout content of your PR's base branch to different directory
 * 4. Create a directory where test projects are going to be generated
 * 5. Run 'tsx scripts/check_api_changes.ts <baselineBranchPath> <workingDirectory>'
 * 6. Remember to reset changes from step 2. i.e. version increments and changelogs
 */

// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

let [baselineRepositoryPath, workingDirectory] = runArgs;

if (!baselineRepositoryPath || !workingDirectory) {
  throw new Error(
    'Usage: tsx scripts/check_api_changes.ts <baselineBranchPath> <workingDirectory>',
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
  '..',
);

console.log(
  `Validating API changes between latest ${latestRepositoryPath} and baseline ${baselineRepositoryPath}`,
);

const packagePaths = await glob(`${latestRepositoryPath}/packages/*`);

const excludedTypesByPackageName: Record<string, Array<string>> = {
  'ai-constructs': [
    // FromJSONSchema is complex enough to trigger
    // index.ts(113,9): error TS2589: Type instantiation is excessively deep and possibly infinite.
    // index.ts(113,87): error TS2589: Type instantiation is excessively deep and possibly infinite.
    // index.ts(113,87): error TS2590: Expression produces a union type that is too complex to represent.
    // See https://github.com/ThomasAribart/json-schema-to-ts/blob/main/documentation/FAQs/i-get-a-type-instantiation-is-excessively-deep-and-potentially-infinite-error-what-should-i-do.md.
    // Therefore, excluding this type from checks.
    'FromJSONSchema',
  ],
};

const validateSinglePackage = async (packagePath: string): Promise<void> => {
  const packageName = path.basename(packagePath);
  const baselinePackagePath = path.join(
    baselineRepositoryPath,
    'packages',
    packageName,
  );
  const baselinePackageApiReportPath = path.join(baselinePackagePath, 'API.md');
  if (!existsSync(baselinePackageApiReportPath)) {
    console.log(
      `Skipping ${packageName} as it does not have baseline API.md file`,
    );
    return;
  }

  console.log(`Validating API changes of ${packageName}`);
  await new ApiChangesValidator(
    packagePath,
    baselinePackageApiReportPath,
    workingDirectory,
    excludedTypesByPackageName[packageName],
  ).validate();
  console.log(`Validation of ${packageName} completed successfully`);
};

// Validate in bounded-concurrency batches rather than all packages at once.
// Each validation runs a full `npm install` of the Amplify graph (unpacking the
// ~225 MB-each bundled data-construct/graphql-api-construct) plus a `tsc` build.
// Running all ~27 in parallel on a 2-core / 7 GB ubuntu-latest runner exhausts
// memory/disk and the runner is killed ("runner received a shutdown signal") —
// consistently ~6 packages in. A small cap keeps peak resource use bounded
// while still validating every package. Coverage is unchanged; only scheduling.
const VALIDATION_CONCURRENCY = 4;
const validationResults: PromiseSettledResult<void>[] = [];
for (let i = 0; i < packagePaths.length; i += VALIDATION_CONCURRENCY) {
  const batch = packagePaths.slice(i, i + VALIDATION_CONCURRENCY);
  validationResults.push(
    ...(await Promise.allSettled(batch.map(validateSinglePackage))),
  );
}

const errors: Array<Error> = [];
validationResults.forEach((result) => {
  if (result.status === 'rejected') {
    errors.push(result.reason);
  }
});

if (errors.length > 0) {
  throw new AggregateError(
    errors,
    `Breaking API changes detected. See below for details.
    If these changes are intentional, this is okay.
    Otherwise, update the PR to remove the unintentional breaks`,
  );
}
