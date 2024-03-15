import { describe, it, mock } from 'node:test';
import { SchemaGenerator, parseDatabaseUrl } from './generate_schema.js';
import assert from 'node:assert';
import {
  TypescriptDataSchemaGenerator,
  TypescriptDataSchemaGeneratorConfig,
} from '@aws-amplify/graphql-schema-generator';
import fs from 'fs';

const mockGenerateMethod =
  mock.fn<(config: TypescriptDataSchemaGeneratorConfig) => Promise<string>>();
mockGenerateMethod.mock.mockImplementation(async () => {
  return 'TYPESCRIPT_DATA_SCHEMA';
});
TypescriptDataSchemaGenerator.generate = mockGenerateMethod;

const mockFsWriteFileSync = mock.method(fs, 'writeFileSync');
mockFsWriteFileSync.mock.mockImplementation(() => {});

void describe('SchemaGenerator', () => {
  void it('should generate schema', async () => {
    const schemaGenerator = new SchemaGenerator();
    await schemaGenerator.generate({
      // eslint-disable-next-line spellcheck/spell-checker
      connectionString: 'mysql://user:password@hostname:3306/db',
      out: 'schema.ts',
    });
    assert.strictEqual(mockGenerateMethod.mock.calls.length, 1);
  });

  void it('should parse database url correctly', async () => {
    const dbConfig = parseDatabaseUrl(
      // eslint-disable-next-line spellcheck/spell-checker
      'mysql://user:password@test-host-name:3306/db'
    );
    // eslint-disable-next-line spellcheck/spell-checker
    assert.strictEqual(dbConfig.engine, 'mysql');
    assert.strictEqual(dbConfig.username, 'user');
    assert.strictEqual(dbConfig.password, 'password');
    assert.strictEqual(dbConfig.host, 'test-host-name');
    assert.strictEqual(dbConfig.database, 'db');
    assert.strictEqual(dbConfig.port, 3306);
  });

  void it('should throw error if one or more parts are missing in the database url', async () => {
    // eslint-disable-next-line spellcheck/spell-checker
    const parse = () => parseDatabaseUrl('mysql://hostname/db');
    assert.throws(parse, {
      name: 'DatabaseUrlParseError',
      message:
        'Unable to parse the database URL. One or more parts of the database URL is missing.',
    });
  });

  void it('should throw error if the connection string is missing port', async () => {
    const parse = () =>
      // eslint-disable-next-line spellcheck/spell-checker
      parseDatabaseUrl('mysql://user:password@mysql-hostname/db');
    assert.throws(parse, {
      name: 'DatabaseUrlParseError',
      message:
        'Unable to parse the database URL. One or more parts of the database URL is missing.',
    });
  });
});
