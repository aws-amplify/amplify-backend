// extract the command args that should be run in each package
const runArgs = process.argv.slice(2);

const latestRepositoryPath = runArgs[0];
const baselineRepositoryPath = runArgs[1];

if (!latestRepositoryPath || !baselineRepositoryPath) {
  throw new Error(
    'Usage: tsx scripts/check_api_changes.ts <latestRepositoryPath> <baselineRepositoryPath>'
  );
}

console.log(
  `Validating api changes between latest ${latestRepositoryPath} and baseline ${baselineRepositoryPath}`
);
