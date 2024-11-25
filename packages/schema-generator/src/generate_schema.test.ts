import { beforeEach, describe, it, mock } from 'node:test';
import { SchemaGenerator, parseDatabaseUrl } from './generate_schema.js';
import assert from 'node:assert';
import {
  EmptySchemaError,
  InvalidSchemaError,
  TypescriptDataSchemaGenerator,
  TypescriptDataSchemaGeneratorConfig,
} from '@aws-amplify/graphql-schema-generator';
import fs from 'fs/promises';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const mockGenerateMethod =
  mock.fn<(config: TypescriptDataSchemaGeneratorConfig) => Promise<string>>();
mockGenerateMethod.mock.mockImplementation(async () => {
  return 'TYPESCRIPT_DATA_SCHEMA';
});
TypescriptDataSchemaGenerator.generate = mockGenerateMethod;

const mockFsWriteFileSync = mock.method(fs, 'writeFile', () => null);

beforeEach(() => {
  mockGenerateMethod.mock.resetCalls();
  mockFsWriteFileSync.mock.resetCalls();
});

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
    assert.strictEqual(mockGenerateMethod.mock.calls[0].arguments.length, 1);
    assert.deepStrictEqual(mockGenerateMethod.mock.calls[0].arguments[0], {
      engine: 'mysql',
      username: 'user',
      password: 'password',
      database: 'db',
      host: 'hostname',
      port: 3306,
      connectionUriSecretName: 'FAKE_SECRET_NAME',
    });
  });

  void it('should generate schema with ssl certificate', async () => {
    const schemaGenerator = new SchemaGenerator();
    await schemaGenerator.generate({
      connectionUri: {
        secretName: 'FAKE_SECRET_NAME',
        value: 'mysql://user:password@hostname:3306/db',
      },
      sslCert: {
        secretName: 'FAKE_SSL_CERT_SECRET_NAME',
        value: 'FAKE_SSL_CERT',
      },
      out: 'schema.ts',
    });
    assert.strictEqual(mockGenerateMethod.mock.calls.length, 1);
    assert.strictEqual(mockFsWriteFileSync.mock.calls.length, 1);
    assert.strictEqual(mockGenerateMethod.mock.calls[0].arguments.length, 1);
    assert.deepStrictEqual(mockGenerateMethod.mock.calls[0].arguments[0], {
      engine: 'mysql',
      username: 'user',
      password: 'password',
      database: 'db',
      host: 'hostname',
      port: 3306,
      connectionUriSecretName: 'FAKE_SECRET_NAME',
      sslCertificateSecretName: 'FAKE_SSL_CERT_SECRET_NAME',
      sslCertificate: 'FAKE_SSL_CERT',
    });
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

  void it('should throw error if database engine is incorrect', async () => {
    const parse = () =>
      parseDatabaseUrl('incorrect://user:password@test-host-name/db');
    assert.throws(parse, {
      name: 'DatabaseUrlParseError',
      message:
        'Unable to parse the database URL. Unsupported database engine: incorrect',
    });
  });

  void it('should throw error if database schema is incorrect', async () => {
    mockGenerateMethod.mock.mockImplementationOnce(() => {
      throw new InvalidSchemaError([{}], ['missingColumn']);
    });
    const schemaGenerator = new SchemaGenerator();
    await assert.rejects(
      () =>
        schemaGenerator.generate({
          connectionUri: {
            secretName: 'FAKE_SECRET_NAME',
            value: 'mysql://user:password@hostname:3306/db',
          },
          out: 'schema.ts',
        }),
      (error: AmplifyUserError) => {
        assert.strictEqual(error.name, 'DatabaseSchemaError');
        assert.strictEqual(
          error.message,
          'Imported SQL schema is invalid. Imported schema is missing columns: missingColumn'
        );
        assert.strictEqual(error.resolution, 'Check the database schema.');
        return true;
      }
    );
  });

  void it('should throw error if database schema is empty', async () => {
    mockGenerateMethod.mock.mockImplementationOnce(() => {
      throw new EmptySchemaError();
    });
    const schemaGenerator = new SchemaGenerator();
    await assert.rejects(
      () =>
        schemaGenerator.generate({
          connectionUri: {
            secretName: 'FAKE_SECRET_NAME',
            value: 'mysql://user:password@hostname:3306/db',
          },
          out: 'schema.ts',
        }),
      (error: AmplifyUserError) => {
        assert.strictEqual(error.name, 'DatabaseSchemaError');
        assert.strictEqual(error.message, 'Imported SQL schema is empty.');
        assert.strictEqual(error.resolution, 'Check the database schema.');
        return true;
      }
    );
  });
});
