import { execa } from 'execa';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';

describe('create-amplify script', () => {
  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

    // clean the npx cache so that we ensure we are installing the latest version from the proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (fs.existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }
  });

  after(async () => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  let tempDir: string;
  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));
    console.log(tempDir);
  });

  afterEach(async () => {
    await fsp.rm(tempDir, { recursive: true });
  });

  it('installs expected packages and scaffolds expected files', async () => {
    await execa('npm', ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });
    const packageJsonPath = path.resolve(tempDir, 'package.json');
    const packageJsonObject = JSON.parse(
      await fsp.readFile(packageJsonPath, 'utf-8')
    );
    assert.deepStrictEqual(
      Object.keys(packageJsonObject.devDependencies).sort(),
      [
        '@aws-amplify/backend',
        '@aws-amplify/backend-auth',
        '@aws-amplify/backend-graphql',
        '@aws-amplify/cli',
        'aws-amplify',
      ]
    );

    const dirContent = await fsp.readdir(path.join(tempDir, 'amplify'));
    assert.deepStrictEqual(dirContent.sort(), [
      'auth.ts',
      'backend.ts',
      'data.ts',
    ]);
  });

  it('fails fast if amplify directory is not empty', async () => {
    const amplifyDirPath = path.join(tempDir, 'amplify');
    await fsp.mkdir(amplifyDirPath, { recursive: true });
    await fsp.writeFile(
      path.join(amplifyDirPath, 'placeholder.txt'),
      'some content'
    );

    const result = await execa('npm', ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
      reject: false,
    });
    assert.equal(result.exitCode, 1);
  });
});
