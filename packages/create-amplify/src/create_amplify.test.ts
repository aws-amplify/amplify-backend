import { execa } from 'execa';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';

/**
 * This test is more of an e2e test than a unit test.
 * But there's really no way to test the create_amplify script without just running the real thing
 *
 * TODO: we may want to pull this test into our e2e suite once we have that setup
 * https://github.com/aws-amplify/samsara-cli/issues/136
 */
describe('create-amplify script', async () => {
  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }
  });

  after(async () => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  let tempDir: string;
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('installs expected packages and scaffolds expected files', async () => {
    // the --yes flag here is to bypass a npm prompt to install the create-amplify package, it's not a prompt we control
    await execa('npm', ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });
    const packageJsonPath = path.resolve(tempDir, 'package.json');
    const packageJsonObject = JSON.parse(
      await fs.readFile(packageJsonPath, 'utf-8')
    );
    assert.deepStrictEqual(
      Object.keys(packageJsonObject.devDependencies).sort(),
      [
        '@aws-amplify/backend',
        '@aws-amplify/backend-auth',
        '@aws-amplify/backend-cli',
        '@aws-amplify/backend-graphql',
        'aws-amplify',
      ]
    );

    const dirContent = await fs.readdir(path.join(tempDir, 'amplify'));
    assert.deepStrictEqual(dirContent.sort(), [
      'auth.ts',
      'backend.ts',
      'data.ts',
    ]);
  });

  it('fails fast if amplify path already exists', async () => {
    const amplifyDirPath = path.join(tempDir, 'amplify');
    await fs.mkdir(amplifyDirPath, { recursive: true });

    // the --yes flag here is to bypass a npm prompt to install the create-amplify package, it's not a prompt we control
    const result = await execa('npm', ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
      reject: false,
    });
    assert.equal(result.exitCode, 1);
  });
});
