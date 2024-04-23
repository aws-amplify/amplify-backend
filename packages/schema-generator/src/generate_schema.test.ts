import { describe, it, mock } from 'node:test';
import { SchemaGenerator, parseDatabaseUrl } from './generate_schema.js';
import assert from 'node:assert';
import {
  TypescriptDataSchemaGenerator,
  TypescriptDataSchemaGeneratorConfig,
} from '@aws-amplify/graphql-schema-generator';
import fs from 'fs/promises';

const mockGenerateMethod =
  mock.fn<(config: TypescriptDataSchemaGeneratorConfig) => Promise<string>>();
mockGenerateMethod.mock.mockImplementation(async () => {
  return 'TYPESCRIPT_DATA_SCHEMA';
});
TypescriptDataSchemaGenerator.generate = mockGenerateMethod;

const mockFsWriteFileSync = mock.method(fs, 'writeFile', () => null);

void describe('SchemaGenerator', () => {
  void it('should generate schema', async () => {
    const schemaGenerator = new SchemaGenerator();
    await schemaGenerator.generate({
      connectionUri: {
        secretName: 'FAKE_SECRET_NAME',
        value: 'mysql://user:password@hostname:3306/db',
      },
      out: 'schema.ts',
    });
    assert.strictEqual(mockGenerateMethod.mock.calls.length, 1);
    assert.strictEqual(mockFsWriteFileSync.mock.calls.length, 1);
  });

  void it('should parse database url correctly', async () => {
    const dbConfig = parseDatabaseUrl(
      'mysql://user:password@test-host-name:3306/db'
    );
    assert.strictEqual(dbConfig.engine, 'mysql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 3306);
  });

  void it('should parse database url correctly with special characters', async () => {
    const dbConfig = parseDatabaseUrl(
      'mysql://user:password@123!@test-host-name:3306/db'
    );
    assert.strictEqual(dbConfig.engine, 'mysql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password@123!');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 3306);
  });

  void it('should parse postgres url correctly', async () => {
    const dbConfig = parseDatabaseUrl(
      'postgresql://user:password@test-host-name:5432/db'
    );
    assert.strictEqual(dbConfig.engine, 'postgresql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 5432);
  });

  void it('should parse database url with postgres protocol correctly', async () => {
    const dbConfig = parseDatabaseUrl(
      'postgres://user:password@test-host-name:5432/db'
    );
    assert.strictEqual(dbConfig.engine, 'postgresql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 5432);
  });

  void it('should assign default port for mysql db url', async () => {
    const dbConfig = parseDatabaseUrl(
      'mysql://user:password@test-host-name/db'
    );
    assert.strictEqual(dbConfig.engine, 'mysql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 3306);
  });

  void it('should assign default port for postgres db url', async () => {
    const dbConfig = parseDatabaseUrl(
      'postgres://user:password@test-host-name/db'
    );
    assert.strictEqual(dbConfig.engine, 'postgresql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 5432);
  });

  void it('should throw error if one or more parts are missing in the database url', async () => {
    const parse = () => parseDatabaseUrl('mysql://hostname/db');
    assert.throws(parse, {
      name: 'DatabaseUrlParseError',
      message:
        'Unable to parse the database URL. One or more parts of the database URL is missing. Missing [username, password].',
    });
  });
});
