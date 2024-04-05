import { beforeEach, describe, it, mock } from 'node:test';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import { printer } from '@aws-amplify/cli-core';

void describe('GitIgnoreInitializer', () => {
  const logMock = mock.method(printer, 'log');

  beforeEach(() => {
    logMock.mock.resetCalls();
  });

  void it('creates .gitignore and adds all contents if no .gitignore file exists', async () => {
    const existsSyncMock = mock.fn(() => false);
    const fsMock = {
      appendFile: mock.fn(),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      `# amplify${os.EOL}`,
      `node_modules${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.equal(
      logMock.mock.calls[0].arguments[0],
      'No .gitignore file found in the working directory. Creating .gitignore...'
    );
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('runs commands to add missing contents if .gitignore file exists - no EOL at the end', async () => {
    const gitIgnoreContent = 'node_modules';
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      os.EOL + os.EOL,
      `# amplify${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('runs commands to add missing contents if .gitignore file exists - with EOL at the end', async () => {
    const gitIgnoreContent = `node_modules${os.EOL}`;
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      os.EOL,
      `# amplify${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('handles patterns with leading /', async () => {
    const gitIgnoreContent = `/node_modules`;
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      `${os.EOL}${os.EOL}`,
      `# amplify${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('handles patterns with trailing /', async () => {
    const gitIgnoreContent = `node_modules/`;
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      `${os.EOL}${os.EOL}`,
      `# amplify${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('handles patterns with leading and trailing /', async () => {
    const gitIgnoreContent = `/node_modules/`;
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      `${os.EOL}${os.EOL}`,
      `# amplify${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });

  void it('handles patterns with multiple / and space', async () => {
    const gitIgnoreContentArray = [
      `node_modules /${os.EOL}`,
      `/ node_modules${os.EOL}`,
      `/no/de_mo/dul/es/ ${os.EOL}`,
      `no/de_mo/dul/es/${os.EOL}`,
      ` /no/de_mo/dul/es${os.EOL}`,
      '//node_modules',
    ];
    const gitIgnoreContent = gitIgnoreContentArray.join('');
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      existsSyncMock,
      fsMock as never
    );
    const expectedGitIgnoreContents = [
      `${os.EOL}${os.EOL}`,
      `# amplify${os.EOL}`,
      `node_modules${os.EOL}`,
      `.amplify${os.EOL}`,
      `amplify_outputs*${os.EOL}`,
      `amplifyconfiguration*${os.EOL}`,
    ];
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      expectedGitIgnoreContents.join(''),
    ]);
  });
});
