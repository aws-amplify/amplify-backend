import { randomUUID } from 'crypto';
import { $ as chainableExeca } from 'execa';
import fsp from 'fs/promises';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { EOL, tmpdir } from 'os';
import path from 'path';
import { GitClient } from './git_client.js';
import { GithubClient } from './github_client.js';
import { NpmClient } from './npm_client.js';
import {
  readPackageJson,
  writePackageJson,
} from './package-json/package_json.js';
import { DependabotVersionUpdateHandler } from './dependabot_version_update_handler.js';
import assert from 'assert';

const originalEnv = process.env;

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client and GitHub context
 */
void describe('dependabot version update handler', async () => {
  let testWorkingDir: string;
  let gitClient: GitClient;
  let npmClient: NpmClient;

  let cantaloupePackageName: string;
  let cantaloupePackagePath: string;
  let platypusPackageName: string;
  let platypusPackagePath: string;

  let baseRef: string;

  const pullRequestBody = 'Bumps testDep from 1.0.0 to 1.1.0.';

  before(async () => {
    process.env.GITHUB_TOKEN = 'testToken';
  });

  after(async () => {
    process.env = originalEnv;
  });

  beforeEach(async ({ name: testName }) => {
    // create temp dir
    const shortId = randomUUID().split('-')[0];
    const testNameNormalized = testName.slice(0, 15).replaceAll(/\s/g, '');
    testWorkingDir = path.join(tmpdir(), `${testNameNormalized}-${shortId}`);
    await fsp.mkdir(testWorkingDir);
    console.log(testWorkingDir);

    gitClient = new GitClient(testWorkingDir);
    npmClient = new NpmClient(null, testWorkingDir);

    const $ = chainableExeca({ stdio: 'inherit', cwd: testWorkingDir });

    // converting to lowercase because npm init creates packages with all lowercase
    cantaloupePackageName =
      `${testNameNormalized}-cantaloupe-${shortId}`.toLocaleLowerCase();
    platypusPackageName =
      `${testNameNormalized}-platypus-${shortId}`.toLocaleLowerCase();

    cantaloupePackagePath = path.join(
      testWorkingDir,
      'packages',
      cantaloupePackageName
    );
    platypusPackagePath = path.join(
      testWorkingDir,
      'packages',
      platypusPackageName
    );

    await gitClient.init();
    await gitClient.switchToBranch('main');
    await npmClient.init();

    await npmClient.initWorkspacePackage(cantaloupePackageName);
    await setPackageToPublic(cantaloupePackagePath);

    await npmClient.initWorkspacePackage(platypusPackageName);
    await setPackageToPublic(platypusPackagePath);

    await npmClient.install(['@changesets/cli']);
    await setPackageDependencies(cantaloupePackagePath, { testDep: '^1.0.0' });
    await setPackageDependencies(platypusPackagePath, { testDep: '^1.0.0' });

    await $`npx changeset init`;
    await gitClient.commitAllChanges('Initial setup');
    baseRef = await gitClient.getHashForCurrentCommit();
  });

  void it('can generate changeset with version updates', async () => {
    const githubClient = new GithubClient('garbage');
    const labelPullRequestMocked = mock.method(
      githubClient,
      'labelPullRequest',
      async () => {}
    );
    const gitPushMocked = mock.method(gitClient, 'push', async () => {});
    const ghContextMocked = {
      eventName: '',
      sha: '',
      ref: '',
      workflow: '',
      action: '',
      actor: '',
      job: '',
      runNumber: 0,
      runId: 0,
      apiUrl: '',
      serverUrl: '',
      graphqlUrl: '',
      payload: {
        pull_request: {
          number: 1,
          body: pullRequestBody,
        },
      },
      issue: {
        owner: '',
        repo: '',
        number: 0,
      },
      repo: {
        owner: '',
        repo: '',
      },
    };

    // Update package.json files for both packages and commit to match what Dependabot will do for a version update PR
    await gitClient.switchToBranch('dependabot/test_update');
    await setPackageDependencies(cantaloupePackagePath, { testDep: '^1.1.0' });
    await setPackageDependencies(platypusPackagePath, { testDep: '^1.1.0' });
    await gitClient.commitAllChanges('Bump dependencies');
    const headRef = await gitClient.getHashForCurrentCommit();

    const dependabotVersionUpdateHandler = new DependabotVersionUpdateHandler(
      baseRef,
      headRef,
      gitClient,
      githubClient,
      testWorkingDir,
      ghContextMocked
    );

    await dependabotVersionUpdateHandler.handleVersionUpdate();

    const changesetFilePath = path.join(
      testWorkingDir,
      `.changeset/dependabot-${headRef}.md`
    );

    await assertChangesetFile(
      changesetFilePath,
      [cantaloupePackageName, platypusPackageName],
      pullRequestBody
    );
    assert.deepEqual(labelPullRequestMocked.mock.calls[0].arguments, [
      1,
      ['run-e2e'],
    ]);
    assert.deepEqual(gitPushMocked.mock.callCount(), 1);
  });
});

const setPackageToPublic = async (packagePath: string) => {
  const packageJson = await readPackageJson(packagePath);
  packageJson.publishConfig = {
    access: 'public',
  };
  await writePackageJson(packagePath, packageJson);
};

const setPackageDependencies = async (
  packagePath: string,
  dependencies: Record<string, string>
) => {
  const packageJson = await readPackageJson(packagePath);
  packageJson.dependencies = dependencies;
  await writePackageJson(packagePath, packageJson);
};

const assertChangesetFile = async (
  filePath: string,
  packageNames: string[],
  message: string
) => {
  const changesetFileContent = await fsp.readFile(filePath, 'utf-8');
  const frontmatterContent = packageNames
    .map((name) => `'${name}': patch`)
    .join(EOL);

  const expectedContent = `---${EOL}${frontmatterContent}${EOL}---${EOL}${EOL}${message}${EOL}`;

  assert.deepEqual(changesetFileContent, expectedContent);
};
