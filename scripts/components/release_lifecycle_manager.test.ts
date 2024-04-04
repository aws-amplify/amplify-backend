import { beforeEach, describe, it } from 'node:test';
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

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client
 * It spins up verdaccio to test updating package metadata locally
 *
 * Since all of these tests are sharing the same git tree, we're running in serial to avoid conflicts (mostly around duplicate tag names)
 */
void describe('ReleaseLifecycleManager', async () => {
  // before(async () => {
  //   await import('../start_npm_proxy.js');
  // });

  // after(async () => {
  //   await import('../stop_npm_proxy.js');
  // });

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

    const gitClient = new GitClient(testWorkingDir);
    const npmClient = new NpmClient(null, testWorkingDir);

    const $ = chainableExeca({ stdio: 'inherit', cwd: testWorkingDir });
    const runVersionInTestDir = () => runVersion([], testWorkingDir);
    const runPublishInTestDir = () =>
      runPublish({ useLocalRegistry: true }, testWorkingDir);

    const packageABaseName = `${testNameNormalized}-packageA-${shortId}`;
    const packageBBaseName = `${testNameNormalized}-packageB-${shortId}`;

    await gitClient.init();
    await npmClient.init();

    await npmClient.initWorkspacePackage(packageABaseName);
    await setPackageToPublic(
      path.join(testWorkingDir, 'packages', packageABaseName)
    );

    await npmClient.initWorkspacePackage(packageBBaseName);
    await setPackageToPublic(
      path.join(testWorkingDir, 'packages', packageBBaseName)
    );

    await npmClient.install(['@changesets/cli']);

    await $`npx changeset init`;
    await gitClient.commitAllChanges('initial commit');
    await runPublishInTestDir();
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [packageABaseName, packageBBaseName],
      'minor'
    );
    await runVersionInTestDir();
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [packageABaseName, packageBBaseName],
      'minor'
    );
    await runVersionInTestDir();
    await runPublishInTestDir();

    await commitVersionBumpChangeset(
      testWorkingDir,
      gitClient,
      [packageABaseName],
      'minor'
    );
    await runVersionInTestDir();
    await runPublishInTestDir();
  });

  void it('dummy test', () => {});
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
  const message = `${bump} version bump for packages ${packageNames.join(
    ', '
  )}`;
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
