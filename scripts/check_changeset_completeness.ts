import getReleasePlan from '@changesets/get-release-plan';
import { GitClient } from './components/git_client.js';
import { readPackageJson } from './components/package-json/package_json.js';
import { EOL } from 'os';
import { ReleasePlan, VersionType } from '@changesets/types';

enum VersionTypeEnum {
  'NONE' = 0,
  'PATCH' = 1,
  'MINOR' = 2,
  'MAJOR' = 3,
}

const checkForMissingChangesets = async (
  releasePlan: ReleasePlan,
  gitClient: GitClient,
  baseRef: string
) => {
  const packagesWithChangeset = new Set(
    releasePlan.releases.map((release) => release.name)
  );

  const changedFiles = await gitClient.getChangedFiles(baseRef);
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
};

const convertVersionType = (version: VersionType): VersionTypeEnum => {
  switch (version) {
    case 'major':
      return VersionTypeEnum.MAJOR;
    case 'minor':
      return VersionTypeEnum.MINOR;
    case 'patch':
      return VersionTypeEnum.PATCH;
    case 'none':
      return VersionTypeEnum.NONE;
  }
};

const findEffectiveVersion = (
  releasePlan: ReleasePlan,
  packageName: string
): VersionTypeEnum => {
  let effectiveVersion: VersionTypeEnum = VersionTypeEnum.NONE;

  for (const changeset of releasePlan.changesets) {
    for (const release of changeset.releases) {
      if (release.name === packageName) {
        const releaseVersionType = convertVersionType(release.type);
        if (releaseVersionType > effectiveVersion) {
          effectiveVersion = releaseVersionType;
        }
      }
    }
  }
  return effectiveVersion;
};

const checkBackendDependenciesVersion = (releasePlan: ReleasePlan) => {
  const backendVersion: VersionTypeEnum = findEffectiveVersion(
    releasePlan,
    '@aws-amplify/backend'
  );
  const backendAuthVersion: VersionTypeEnum = findEffectiveVersion(
    releasePlan,
    '@aws-amplify/backend-auth'
  );
  const backendDataVersion: VersionTypeEnum = findEffectiveVersion(
    releasePlan,
    '@aws-amplify/backend-data'
  );
  const backendFunctionVersion: VersionTypeEnum = findEffectiveVersion(
    releasePlan,
    '@aws-amplify/backend-function'
  );
  const backendStorageVersion: VersionTypeEnum = findEffectiveVersion(
    releasePlan,
    '@aws-amplify/backend-storage'
  );

  if (
    backendVersion <
    Math.max(
      backendAuthVersion,
      backendDataVersion,
      backendFunctionVersion,
      backendStorageVersion
    )
  ) {
    throw new Error(
      `@aws-amplify/backend has a version bump of a different kind from its dependencies (@aws-amplify/backend-auth, @aws-amplify/backend-data, @aws-amplify/backend-function, or @aws-amplify/backend-storage) but is expected to have a version bump of the same kind.${EOL}`
    );
  }
};

const gitClient = new GitClient();

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error('No base ref specified for changeset completeness check');
}

const releasePlan = await getReleasePlan(process.cwd());

await checkForMissingChangesets(releasePlan, gitClient, baseRef);
checkBackendDependenciesVersion(releasePlan);
