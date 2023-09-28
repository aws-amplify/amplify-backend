import { execa } from 'execa';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { glob } from 'glob';

void describe('create-amplify script', () => {
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

  void it('installs expected packages and scaffolds expected files', async () => {
    // TODO remove alpha tag from command once we are publishing to latest
    // https://github.com/aws-amplify/samsara-cli/issues/144
    // the --yes flag here is to bypass a npm prompt to install the create-amplify package, it's not a prompt we control
    await execa('npm', ['create', 'amplify@alpha', '--yes'], {
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
      ]
    );

    assert.deepStrictEqual(Object.keys(packageJsonObject.dependencies).sort(), [
      'aws-amplify',
    ]);

    const pathPrefix = path.join(tempDir, 'amplify');

    const files = await glob(path.join(pathPrefix, '**', '*'));

    assert.deepStrictEqual(
      files.sort(),
      [
        path.join('auth', 'resource.ts'),
        'backend.ts',
        path.join('data', 'resource.ts'),
      ].map((suffix) => path.join(pathPrefix, suffix))
    );
  });

  void it('fails fast if amplify path already exists', async () => {
    const amplifyDirPath = path.join(tempDir, 'amplify');
    await fs.mkdir(amplifyDirPath, { recursive: true });

    // TODO remove alpha tag from command once we are publishing to latest
    // https://github.com/aws-amplify/samsara-cli/issues/144
    // the --yes flag here is to bypass a npm prompt to install the create-amplify package, it's not a prompt we control
    const result = await execa('npm', ['create', 'amplify@alpha', '--yes'], {
      cwd: tempDir,
      stdio: 'pipe',
      reject: false,
    });
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.stderr
        .toLocaleString()
        .includes(
          'Either delete this file/directory or initialize the project in a different location'
        )
    );
  });
});
