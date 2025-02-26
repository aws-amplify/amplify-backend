import { context as ghContext } from '@actions/github';
import { Context } from '@actions/github/lib/context.js';
import fsp from 'fs/promises';
import { EOL } from 'os';
import { GitClient } from './git_client.js';
import { GithubClient } from './github_client.js';
import { readPackageJson } from './package-json/package_json.js';
import path from 'path';

/**
 * Handles the follow up processes of Dependabot opening a version update PR
 */
export class DependabotVersionUpdateHandler {
  /**
   * Initialize with version update config and necessary clients
   */
  constructor(
    private readonly baseRef: string,
    private readonly gitClient: GitClient,
    private readonly ghClient: GithubClient,
    private readonly _rootDir: string = process.cwd(),
    private readonly _ghContext: Context = ghContext
  ) {}

  /**
   * This method handles all of the follow up processes we would want run when Dependabot opens a version update PR.
   *
   * We would want a changeset file generated for Dependabot version update PRs in order for these version updates to be part of our release process.
   * We also want to run our E2E tests on these version updates to ensure new dependency updates don't break us.
   *
   * Running this method when either of the following are true results in a no-op:
   * - GitHub context event is not a pull request
   * - Branch PR does not start with `dependabot/`, meaning the branch isn't for a Dependabot PR
   * - PR already has a changeset in list of files changed
   */
  handleVersionUpdate = async () => {
    if (!this._ghContext.payload.pull_request) {
      // event is not a pull request, return early
      return;
    }

    const branch = this._ghContext.payload.pull_request.head.ref;
    await this.gitClient.switchToBranch(branch);
    if (!branch.startsWith('dependabot/')) {
      // if branch is not a dependabot branch, return early
      return;
    }

    const changedFiles = await this.gitClient.getChangedFiles(this.baseRef);
    if (changedFiles.find((file) => file.startsWith('.changeset'))) {
      // if changeset file already exists, return early
      return;
    }

    // Get all of the public packages with version updates (where 'package.json' is modified)
    const modifiedPackageDirs = new Set<string>();
    const packageJsonFiles = changedFiles.filter(
      (changedFile) =>
        changedFile.startsWith('packages/') &&
        changedFile.endsWith('package.json')
    );
    packageJsonFiles.forEach((changedPackageFile) => {
      modifiedPackageDirs.add(
        changedPackageFile.split('/').slice(0, 2).join('/')
      );
    });

    const packageNames = [];
    for (const modifiedPackageDir of modifiedPackageDirs) {
      const packageJson = await readPackageJson(
        path.join(this._rootDir, modifiedPackageDir)
      );
      if (!packageJson.private) {
        packageNames.push(packageJson.name);
      }
    }

    // Create and commit the changeset file, then add the 'run-e2e' label and force push to the PR
    const fileName = path.join(
      this._rootDir,
      `.changeset/dependabot-${this._ghContext.payload.pull_request.head.sha}.md`
    );
    const versionUpdates = await this.getVersionUpdates();
    await this.createChangesetFile(fileName, versionUpdates, packageNames);
    await this.gitClient.status();
    await this.gitClient.commitAllChanges('add changeset');
    await this.ghClient.labelPullRequest(
      this._ghContext.payload.pull_request.number,
      ['run-e2e']
    );
    await this.gitClient.push({ force: true });
  };

  private createChangesetFile = async (
    fileName: string,
    versionUpdates: string[],
    packageNames: string[]
  ) => {
    let message = '';
    let content = '';

    for (const update of versionUpdates) {
      message += `${update}${EOL}`;
    }

    const frontmatterContent = packageNames
      .map((name) => `'${name}': patch`)
      .join(EOL);

    if (packageNames.length === 0 || versionUpdates.length === 0) {
      content = `---${EOL}---${EOL}`;
    } else {
      content = `---${EOL}${frontmatterContent}${EOL}---${EOL}${EOL}${message.trim()}${EOL}`;
    }
    await fsp.writeFile(fileName, content);
  };

  private getVersionUpdates = async () => {
    const updates: string[] = [];
    const prBody = this._ghContext.payload.pull_request?.body;

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
}
