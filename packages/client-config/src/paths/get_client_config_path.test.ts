import fs from 'fs';
import { describe, it, mock } from 'node:test';
import * as path from 'path';
import assert from 'node:assert';
import { getClientConfigPath } from './get_client_config_path.js';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';
const testPath = 'some/path';

mock.method(fs, 'lstatSync', (path: string) => {
  if (path === testPath || path === `${process.cwd()}/${testPath}`) {
    return { isFile: () => false, isDir: () => true };
  }
  return {
    isFile: () => {
      throw new Error(`ENOENT: no such file or directory, lstat '${path}'`);
    },
    isDir: () => false,
  };
});

void describe('getClientConfigPath', () => {
  void it('returns path to config file', async () => {
    const configPath = await getClientConfigPath();
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.JSON}`)
    );
  });

  void it('returns path to config file with provided dir path', async () => {
    const configPath = await getClientConfigPath(testPath);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to config file with provided dir path and format', async () => {
    const configPath = await getClientConfigPath(
      testPath,
      ClientConfigFormat.JSON
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to config file with provided format, no dir path', async () => {
    const configPath = await getClientConfigPath(
      undefined,
      ClientConfigFormat.TS
    );
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.TS}`)
    );
  });

  void it('throw error if it is provided a file path', async () => {
    await assert.rejects(
      async () => await getClientConfigPath(`${testPath}/testConfig.json`),
      new Error(
        "ENOENT: no such file or directory, lstat 'some/path/testConfig.json'"
      )
    );
  });

  void it('throw error if it is provided invalid path', async () => {
    await assert.rejects(
      async () => await getClientConfigPath('some/not/existing/path'),
      new Error(
        "ENOENT: no such file or directory, lstat 'some/not/existing/path'"
      )
    );
  });

  void it('returns path to config file with absolute path', async () => {
    const configPath = await getClientConfigPath(
      `${process.cwd()}/${testPath}`
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  const expectedFileExtensions = [
    {
      format: ClientConfigFormat.MJS,
      expectedFileExtension: '.mjs',
    },
    {
      format: ClientConfigFormat.TS,
      expectedFileExtension: '.ts',
    },
    {
      format: ClientConfigFormat.DART,
      expectedFileExtension: '.dart',
    },
    {
      format: ClientConfigFormat.JSON,
      expectedFileExtension: '.json',
    },
    {
      format: ClientConfigFormat.JSON_MOBILE,
      expectedFileExtension: '.json',
    },
  ] as const;
  expectedFileExtensions.forEach((entry) => {
    void it(`path for ${entry.format} should have ${entry.expectedFileExtension} suffix`, async () => {
      const configPath = await getClientConfigPath(undefined, entry.format);

      assert.ok(configPath.endsWith(entry.expectedFileExtension));
    });
  });
});
