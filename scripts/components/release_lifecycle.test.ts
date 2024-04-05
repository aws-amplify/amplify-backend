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

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client
 * It spins up verdaccio to test updating package metadata locally
 */
void describe('ReleaseLifecycleManager', async () => {
  let gitClient: GitClient;
  let npmClient: NpmClient;

  let cantaloupePackageName: string;
  let platypusPackageName: string;

  // TODO uncomment before merging
  before(async () => {
    await import('../start_npm_proxy.js');
  });

  after(async () => {
    await import('../stop_npm_proxy.js');
  });

  /**
   * This setup initializes a "sandbox" git repo that has a js mono repo with 2 packages, cantaloupe and platypus
   * It seeds the local npm proxy with a few releases of these packages.
   * When its done, the state of the git refs npm dist-tags should be as follows:
   *
   * third release commit                   ● <- HEAD, cantaloupe@1.3.0, cantaloupe@latest
   *                                        |
   * minor bump of cantaloupe only          ●
   *                                        |
   * second release commit                  ● <- cantaloupe@1.2.0, platypus@1.2.0, platypus@latest
   *                                        |
   * minor bump of cantaloupe and platypus  ●
   *                                        |
   * first release commit                   ● <- cantaloupe@1.1.0, platypus@1.1.0
   *                                        |
   * minor bump of cantaloupe and platypus  ●
   *                                        |
   * initial commit                         ● <- cantaloupe@1.0.0, platypus@1.0.0
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
    await gitClient.commitAllChanges('initial commit');
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
      [cantaloupePackageName, platypusPackageName],
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
  });

  void it('dummy test', async () => {
    const githubClient = new GithubClient('garbage');
    mock.method(githubClient, 'createPr', async () => ({ prUrl: 'testPrUrl' }));
    mock.method(gitClient, 'push', async () => {});
    const releaseDeprecator = new ReleaseDeprecator(
      'HEAD',
      'the cantaloupe is rotten',
      githubClient,
      gitClient,
      npmClient,
      new DistTagMover(npmClient)
    );
    await releaseDeprecator.deprecateRelease();
    // switch back to the original branch
    await gitClient.switchToBranch('main');

    // expect latest of cantaloupe to point back to 1.2.0 and 1.3.0 to be marked deprecated

    const { 'dist-tags': distTags, deprecated } =
      await npmClient.getPackageInfo(`${cantaloupePackageName}@1.3.0`);
    assert.equal(distTags.latest, '1.2.0');
    assert.equal(deprecated, 'the cantaloupe is rotten');
  });
});

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
