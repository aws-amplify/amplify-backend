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

describe('getClientConfigPath', () => {
  it('returns path to config file', () => {
    const configPath = getClientConfigPath();
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.JS}`)
    );
  });

  it('returns path to config file with provided dir path', () => {
    const configPath = getClientConfigPath(testPath);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JS}`
      )
    );
  });

  it('returns path to config file with provided dir path and format', () => {
    const configPath = getClientConfigPath(testPath, ClientConfigFormat.JSON);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  it('returns path to config file with provided format, no dir path', () => {
    const configPath = getClientConfigPath(undefined, ClientConfigFormat.TS);
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.TS}`)
    );
  });

  it('throw error if it is provided a file path', () => {
    assert.throws(
      () => getClientConfigPath(`${testPath}/testConfig.json`),
      new Error(
        "ENOENT: no such file or directory, lstat 'some/path/testConfig.json'"
      )
    );
  });

  it('throw error if it is provided invalid path', () => {
    assert.throws(
      () => getClientConfigPath('some/not/existing/path'),
      new Error(
        "ENOENT: no such file or directory, lstat 'some/not/existing/path'"
      )
    );
  });

  it('returns path to config file with absolute path', () => {
    const configPath = getClientConfigPath(`${process.cwd()}/${testPath}`);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JS}`
      )
    );
  });
});
