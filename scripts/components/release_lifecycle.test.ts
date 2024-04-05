import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { EOL, tmpdir } from 'os';
import * as path from 'path';
import { GitClient } from './git_client.js';
import { NpmClient } from './npm_client.js';
import { $ as chainableExeca } from 'execa';
import {
  readPackageJson,
  writePackageJson,
} from './package-json/package_json.js';
import { runVersion } from '../version_runner.js';
import { runPublish } from '../publish_runner.js';
import { GithubClient } from './github_client.js';
import assert from 'node:assert';
import { ReleaseDeprecator } from './release_deprecator.js';
import { DistTagMover } from './dist_tag_mover.js';
import { ReleaseRestorer } from './release_restorer.js';

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client
 * It spins up verdaccio to test updating package metadata locally
 */
void describe('release lifecycle', async () => {
  let gitClient: GitClient;
  let npmClient: NpmClient;

  let cantaloupePackageName: string;
  let platypusPackageName: string;

  before(async () => {
    await import('../start_npm_proxy.js');
  });

  after(async () => {
    await import('../stop_npm_proxy.js');
  });

  /**
   * This setup initializes a "sandbox" git repo that has a js mono repo with 2 packages, cantaloupe and platypus
   * It seeds the local npm proxy with a few releases of these packages.
   * When its done, the state of the git refs and npm dist-tags should be as follows:
   *
   * third release commit                   ● <- HEAD, cantaloupe@1.2.0, cantaloupe@latest
   *                                        |
   * minor bump of cantaloupe only          ●
   *                                        |
   * second release commit                  ● <- platypus@1.2.0, platypus@latest
   *                                        |
   * minor bump of platypus only            ●
   *                                        |
   * first release commit                   ● <- cantaloupe@1.1.0, platypus@1.1.0
   *                                        |
   * minor bump of cantaloupe and platypus  ●
   *                                        |
   * baseline release                       ● <- cantaloupe@1.0.0, platypus@1.0.0
   *
   */
  beforeEach(async ({ name: testName }) => {
    // create temp dir
    const shortId = randomUUID().split('-')[0];
    const testNameNormalized = testName.slice(0, 15).replaceAll(/\s/g, '');
    const testWorkingDir = path.join(
      tmpdir(),
      `${testNameNormalized}-${shortId}`
    );
    await mkdir(testWorkingDir);
    console.log(testWorkingDir);

    gitClient = new GitClient(testWorkingDir);
    npmClient = new NpmClient(null, testWorkingDir);

    const $ = chainableExeca({ stdio: 'inherit', cwd: testWorkingDir });
    const runVersionInTestDir = () => runVersion([], testWorkingDir);
    const runPublishInTestDir = () =>
      runPublish({ useLocalRegistry: true }, testWorkingDir);

    // converting to lowercase because npm init creates packages with all lowercase
    cantaloupePackageName =
      `${testNameNormalized}-cantaloupe-${shortId}`.toLocaleLowerCase();
    platypusPackageName =
      `${testNameNormalized}-platypus-${shortId}`.toLocaleLowerCase();

    await gitClient.init();
    await gitClient.switchToBranch('main');
    await npmClient.init();

    await npmClient.initWorkspacePackage(cantaloupePackageName);
    await setPackageToPublic(
      path.join(testWorkingDir, 'packages', cantaloupePackageName)
    );

    await npmClient.initWorkspacePackage(platypusPackageName);
    await setPackageToPublic(
      path.join(testWorkingDir, 'packages', platypusPackageName)
    );

    await npmClient.install(['@changesets/cli']);

    await $`npx changeset init`;
    await gitClient.commitAllChanges('Version Packages (baseline release)');
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [cantaloupePackageName, platypusPackageName],
      'minor'
    );
    await runVersionInTestDir();
    await gitClient.commitAllChanges('Version Packages (first release)');
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [platypusPackageName],
      'minor'
    );
    await runVersionInTestDir();
    await gitClient.commitAllChanges('Version Packages (second release)');
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [cantaloupePackageName],
      'minor'
    );
    await runVersionInTestDir();
    await gitClient.commitAllChanges('Version Packages (third release)');
    await runPublishInTestDir();

    // sanity check initial state
    await expectDistTagAtVersion(
      npmClient,
      cantaloupePackageName,
      '1.2.0',
      'latest'
    );
    await expectDistTagAtVersion(
      npmClient,
      platypusPackageName,
      '1.2.0',
      'latest'
    );
  });

  void it('can deprecate and restore packages using npm metadata', async () => {
    const githubClient = new GithubClient('garbage');
    mock.method(githubClient, 'createPullRequest', async () => ({
      prUrl: 'testPrUrl',
    }));
    mock.method(gitClient, 'push', async () => {});
    const distTagMover = new DistTagMover(npmClient);
    const releaseDeprecator1 = new ReleaseDeprecator(
      'HEAD',
      'the cantaloupe is rotten',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );
    await releaseDeprecator1.deprecateRelease();

    // expect cantaloupe@1.2.0 to be deprecated and cantaloupe@latest = 1.1.0
    await expectDeprecated(
      npmClient,
      cantaloupePackageName,
      '1.2.0',
      'the cantaloupe is rotten'
    );
    await expectDistTagAtVersion(
      npmClient,
      cantaloupePackageName,
      '1.1.0',
      'latest'
    );

    // now deprecate the platypus release

    await gitClient.switchToBranch('main');
    const releaseDeprecator2 = new ReleaseDeprecator(
      'HEAD~',
      'RIP platypus',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );

    await releaseDeprecator2.deprecateRelease();

    // expect platypus@1.2.0 to be deprecated and platypus@latest = 1.1.0
    await expectDeprecated(
      npmClient,
      platypusPackageName,
      '1.2.0',
      'RIP platypus'
    );
    await expectDistTagAtVersion(
      npmClient,
      platypusPackageName,
      '1.1.0',
      'latest'
    );

    // now deprecate the 1.1.0 release of both packages

    await gitClient.switchToBranch('main');
    const releaseDeprecator3 = new ReleaseDeprecator(
      'HEAD~3',
      'real big mess',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );

    await releaseDeprecator3.deprecateRelease();

    // expect platypus@1.1.0  and cantaloupe@1.1.0 to be deprecated and @latest points to 1.0.0 for both
    await expectDeprecated(
      npmClient,
      platypusPackageName,
      '1.1.0',
      'real big mess'
    );
    await expectDistTagAtVersion(
      npmClient,
      platypusPackageName,
      '1.0.0',
      'latest'
    );
    await expectDeprecated(
      npmClient,
      cantaloupePackageName,
      '1.1.0',
      'real big mess'
    );
    await expectDistTagAtVersion(
      npmClient,
      cantaloupePackageName,
      '1.0.0',
      'latest'
    );

    /* To validate the restore scenarios, we now "undo" the rollbacks */

    await gitClient.switchToBranch('main');
    const releaseRestorer1 = new ReleaseRestorer(
      'HEAD~3',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );

    await releaseRestorer1.restoreRelease();

    // expect platypus@1.1.0 and cantaloupe@1.1.0 to be @latest and no longer deprecated
    await expectNotDeprecated(npmClient, platypusPackageName, '1.1.0');
    await expectDistTagAtVersion(
      npmClient,
      platypusPackageName,
      '1.1.0',
      'latest'
    );
    await expectNotDeprecated(npmClient, cantaloupePackageName, '1.1.0');
    await expectDistTagAtVersion(
      npmClient,
      cantaloupePackageName,
      '1.1.0',
      'latest'
    );

    await gitClient.switchToBranch('main');
    const releaseRestorer2 = new ReleaseRestorer(
      'HEAD~',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );

    await releaseRestorer2.restoreRelease();

    // expect platypus@1.2.0 to @latest and no longer deprecated
    await expectNotDeprecated(npmClient, platypusPackageName, '1.2.0');
    await expectDistTagAtVersion(
      npmClient,
      platypusPackageName,
      '1.2.0',
      'latest'
    );

    await gitClient.switchToBranch('main');
    const releaseRestorer3 = new ReleaseRestorer(
      'HEAD',
      githubClient,
      gitClient,
      npmClient,
      distTagMover
    );

    await releaseRestorer3.restoreRelease();

    // expect cantaloupe@1.2.0 to be @latest and no longer deprecated
    await expectNotDeprecated(npmClient, cantaloupePackageName, '1.2.0');
    await expectDistTagAtVersion(
      npmClient,
      cantaloupePackageName,
      '1.2.0',
      'latest'
    );

    // We are now back to the original state having deprecated and then restored 3 releases
  });
});

const expectDeprecated = async (
  npmClient: NpmClient,
  packageName: string,
  version: string,
  deprecationMessage: string
) => {
  const { deprecated } = await npmClient.getPackageInfo(
    `${packageName}@${version}`
  );
  assert.equal(deprecated, deprecationMessage);
};

const expectNotDeprecated = async (
  npmClient: NpmClient,
  packageName: string,
  version: string
) => {
  const { deprecated } = await npmClient.getPackageInfo(
    `${packageName}@${version}`
  );
  assert.equal(deprecated, undefined);
};

const expectDistTagAtVersion = async (
  npmClient: NpmClient,
  packageName: string,
  version: string,
  distTag: string
) => {
  const { 'dist-tags': distTags } = await npmClient.getPackageInfo(packageName);
  assert.equal(distTags[distTag], version);
};

const setPackageToPublic = async (packagePath: string) => {
  const packageJson = await readPackageJson(packagePath);
  packageJson.publishConfig = {
    access: 'public',
  };
  await writePackageJson(packagePath, packageJson);
};

const commitVersionBumpChangeset = async (
  projectPath: string,
  gitClient: GitClient,
  packageNames: string[],
  bump: VersionBump
) => {
  const message = `${bump} bump for ${packageNames.join(', ')}`;
  await writeFile(
    path.join(projectPath, '.changeset', `${randomUUID()}.md`),
    getChangesetContent(packageNames, bump, message)
  );
  await gitClient.commitAllChanges(message);
};

const getChangesetContent = (
  packageNames: string[],
  bump: VersionBump,
  message: string
) => {
  const packageBumpsString = packageNames
    .map((packageName) => `'${packageName}': ${bump}`)
    .join(EOL);
  const template = `---
${packageBumpsString}
---

${message}
`;
  return template;
};

type VersionBump = 'major' | 'minor' | 'patch';
