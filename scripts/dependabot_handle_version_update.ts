import { context as ghContext } from '@actions/github';
import fsp from 'fs/promises';
import { EOL } from 'os';
import { GitClient } from './components/git_client.js';
import { readPackageJson } from './components/package-json/package_json.js';
import { GithubClient } from './components/github_client.js';

const createChangesetFile = async (
  versionUpdates: string[],
  packageNames: string[]
) => {
  let message = '';

  for (const update of versionUpdates) {
    message += `${update}${EOL}`;
  }

  const frontmatterContent = packageNames
    .map((name) => `'${name}': patch`)
    .join(EOL);
  const body = `---${EOL}${frontmatterContent}${EOL}---${EOL}${EOL}${message.trim()}${EOL}`;
  await fsp.writeFile(fileName, body);
};

const getVersionUpdates = async () => {
  const updates: string[] = [];
  const prBody = ghContext.payload.pull_request?.body;

  // Match lines in PR body that are one of the following:
  // Updates `<dependency>` from <old-version> to <new-version>
  // Bumps [<dependency>](<dependency-link>) from <old-version> to <new-version>.
  const matches = prBody?.match(
    /(Updates|Bumps) (.*) from [0-9.]+ to [0-9.]+/g
  );

  for (const match of matches ?? []) {
    updates.push(match);
  }

  return updates;
};

if (!ghContext.payload.pull_request) {
  // event is not a pull request, return early
  process.exit();
}

const gitClient = new GitClient();
const ghClient = new GithubClient();

const branch = await gitClient.getCurrentBranch();
if (!branch.startsWith('dependabot/')) {
  // if branch is not a dependabot branch, return early
  process.exit();
}

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error('No base ref specified for generate changeset check');
}

const headRef = process.argv[3];
if (headRef === undefined) {
  throw new Error('No head ref specified for generate changeset check');
}

const changedFiles = await gitClient.getChangedFiles(baseRef);
if (changedFiles.find((file) => file.startsWith('.changeset'))) {
  // if changeset file already exists, return early
  process.exit();
}

const modifiedPackageDirs = new Set<string>();

const packageJsonFiles = changedFiles.filter(
  (changedFile) =>
    changedFile.startsWith('packages/') && changedFile.endsWith('package.json')
);
packageJsonFiles.forEach((changedPackageFile) => {
  modifiedPackageDirs.add(changedPackageFile.split('/').slice(0, 2).join('/'));
});

const packageNames = [];
for (const modifiedPackageDir of modifiedPackageDirs) {
  const packageJson = await readPackageJson(modifiedPackageDir);
  if (!packageJson.private) {
    packageNames.push(packageJson.name);
  }
}

const fileName = `.changeset/dependabot-${headRef}.md`;
const versionUpdates = await getVersionUpdates();
await createChangesetFile(versionUpdates, packageNames);
await gitClient.commitAllChanges('add changeset');
await ghClient.labelPullRequest(ghContext.payload.pull_request.number, [
  'run-e2e',
]);
await gitClient.push({ force: true });
