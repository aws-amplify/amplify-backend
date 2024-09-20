import getReleasePlan from '@changesets/get-release-plan';
import { GitClient } from './components/git_client.js';
import { readPackageJson } from './components/package-json/package_json.js';
import { EOL } from 'os';

// one function checks to see if any changesets are missing
// one function checks if there are version bumps that should affect backend and whether backend is getting the right type of bump as a result

const getModifiedPackages = (changedFiles: string[]) => {
  const modifiedPackageDirs = new Set<string>();

  changedFiles
    .filter(
      (changedFile) =>
        changedFile.startsWith('packages/') && !changedFile.endsWith('test.ts')
    )
    .forEach((changedPackageFile) => {
      modifiedPackageDirs.add(
        changedPackageFile.split('/').slice(0, 2).join('/')
      );
    });
  return modifiedPackageDirs;
};

/*
const checkBackendDependenciesVersion = (
  releasePlan: ReleasePlan
) => {
  const backendDependencies: string[] = [
    '@aws-amplify/backend-auth',
    '@aws-amplify-backend/data',
    '@aws-amplify/backend-function',
    '@aws-amplify/backend-storage',
  ];
  const backendName: string = '@aws-amplify/backend';
  const versionBumpOfWrongKind: string[] = [];
  

  // check if dependencies have a changeset
  // if they do, check if backend has a changeset of the same kind
  // will aggregate the errors if multiple appear

  if (versionBumpOfWrongKind.length > 0) {
    throw new Error(
      `${backendName} has a version bump of a different kind of the following packages but is expected to have a version bump of the same kind:${EOL}${versionBumpOfWrongKind.join(
        EOL
      )}`
    );
  }
};
*/

const gitClient = new GitClient();

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error('No base ref specified for changeset completeness check');
}

const releasePlan = await getReleasePlan(process.cwd());

const packagesWithChangeset = new Set(
  releasePlan.releases.map((release) => release.name)
);

const changedFiles = await gitClient.getChangedFiles(baseRef);

const modifiedPackageDirs = getModifiedPackages(changedFiles);

const packagesMissingChangesets = [];
for (const modifiedPackageDir of modifiedPackageDirs) {
  const { name: modifiedPackageName, private: isPrivate } =
    await readPackageJson(modifiedPackageDir);
  if (isPrivate) {
    continue;
  }
  if (!packagesWithChangeset.has(modifiedPackageName)) {
    packagesMissingChangesets.push(modifiedPackageName);
  }
}

if (packagesMissingChangesets.length > 0) {
  throw new Error(
    `The following packages have changes but are not included in any changeset:${EOL}${EOL}${packagesMissingChangesets.join(
      EOL
    )}${EOL}${EOL}Add a changeset using 'npx changeset add'.`
  );
}

//checkBackendDependenciesVersion(releasePlan);
