import { context as ghContext } from '@actions/github';
import { createAmplifyDepUpdater } from './components/create_amplify_dep_updater.js';
import { getDependenciesFromPackageLock } from './components/get_dependencies_from_package_lock.js';
import { GitClient } from './components/git_client.js';
import {
  BumpType,
  createChangesetFile,
} from './components/create_changeset_file.js';
import path from 'path';

/**
 * This script makes sure the pinned versions of dependencies in create amplify
 * stay up to date with what we are using in the library.
 */

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error('No base ref specified for update create amplify deps');
}

if (!ghContext.payload.pull_request) {
  // event is not a pull request, return early
  process.exit();
}

const packageLock = 'package-lock.json';
const branch = ghContext.payload.pull_request.head.ref;
const gitClient = new GitClient();
await gitClient.switchToBranch(branch);
const changedFiles = await gitClient.getChangedFiles(baseRef);

if (!changedFiles.includes(packageLock)) {
  // package-lock.json was not changed, return early
  process.exit();
}

const dependencies = await getDependenciesFromPackageLock(packageLock);

const createAmplifyDepsUpdated = await createAmplifyDepUpdater(dependencies);

if (createAmplifyDepsUpdated) {
  const changesetFilePath = path.join(
    process.cwd(),
    `.changeset/create-amplify-${ghContext.payload.pull_request.head.sha}.md`
  );
  const changeSummary = 'update create amplify dependencies';
  await createChangesetFile(
    changesetFilePath,
    [{ packageName: 'create-amplify', bumpType: BumpType.PATCH }],
    changeSummary
  );
  await gitClient.status();
  await gitClient.commitAllChanges(changeSummary);
  await gitClient.push({ force: true });
}
