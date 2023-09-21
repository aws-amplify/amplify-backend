import { describe, it } from 'node:test';
import * as path from 'path';
import assert from 'node:assert';
import { getClientConfigPath } from './get_client_config_path.js';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';
describe('getClientConfigPath', () => {
  it('returns path to config file', () => {
    const configPath = getClientConfigPath();
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.JS}`)
    );
  });

  it('returns path to config file with provided dir path', () => {
    const configPath = getClientConfigPath('some/path');
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        'some/path',
        `${configFileName}.${ClientConfigFormat.JS}`
      )
    );
  });

  it('returns path to config file with provided dir path and format', () => {
    const configPath = getClientConfigPath(
      'some/path',
      ClientConfigFormat.JSON
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        'some/path',
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
      () => getClientConfigPath('some/path/testConfig.json'),
      new Error('Provided path should be a directory without a file name')
    );
  });

  it('returns path to config file with absolute path', () => {
    const configPath = getClientConfigPath(`${process.cwd()}/some/path`);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        'some/path',
        `${configFileName}.${ClientConfigFormat.JS}`
      )
    );
  });
});
