import { TypescriptDataSchemaGenerator } from '@aws-amplify/graphql-schema-generator';
import * as fs from 'fs';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type SchemaGeneratorConfig = {
  connectionString: string;
  out: string;
};

/**
 * Schema generator class.
 */
export class SchemaGenerator {
  generate = async (props: SchemaGeneratorConfig) => {
    const dbConfig = parseDatabaseUrl(props.connectionString);

    try {
      const schema = await TypescriptDataSchemaGenerator.generate(dbConfig);
      fs.writeFileSync(props.out, schema);
      fs.chmodSync(props.out, 0o400);
    } catch (err) {
      const databaseError = err as DatabaseConnectError;
      if (databaseError.code === 'ETIMEDOUT') {
        throw new AmplifyUserError(
          'DatabaseConnectionError',
          {
            message: `Unable to connect to the database at ${dbConfig.host}:${dbConfig.port}. `,
            resolution:
              'Check if the credentials are correct. Also, check if the database is running and accessible from the network.',
          },
          databaseError
        );
      }

      const schemaFileError = err as SchemaOutputFileError;
      if (schemaFileError.code === 'EACCES') {
        throw new AmplifyUserError('SchemaFileWriteError', {
          message: `Unable to write to the file at ${props.out}.`,
          resolution:
            'If the file already exists, make sure you have the necessary permissions to overwrite.',
        });
      }
      throw err;
    }
  };
}

export type MySQLEngine = 'mysql';
export type PostgreSQLEngine = 'postgresql';
export type SQLEngine = MySQLEngine | PostgreSQLEngine;

export type SQLDataSourceConfig = {
  engine: SQLEngine;
  username: string;
  password: string;
  host: string;
  database: string;
  port: number;
};

/**
 * Error for database connection failures.
 */
export class DatabaseConnectError extends Error {
  /**
   * Creates database connection error.
   */
  constructor(readonly code: string, readonly errorno: string) {
    super(`Database connection error: ${code} ${errorno}`);
  }
}

/**
 * Error for schema output file.
 */
export class SchemaOutputFileError extends Error {
  /**
   * Creates schema output file error.
   */
  constructor(readonly code: string, readonly errorno: string) {
    super(`Schema file generate error: ${code} ${errorno}`);
  }
}

/**
 * Parses database URL into a configuration object.
 */
export const parseDatabaseUrl = (databaseUrl: string): SQLDataSourceConfig => {
  try {
    const parsedDatabaseUrl = new URL(databaseUrl);
    const { username, password, hostname: host } = parsedDatabaseUrl;
    const database = parsedDatabaseUrl?.pathname?.slice(1);
    const port = parseInt(parsedDatabaseUrl?.port, 10);
    const engine = parsedDatabaseUrl?.protocol?.slice(0, -1) as SQLEngine;

    const config = {
      engine,
      username,
      password,
      database,
      host,
      port,
    };
    return config;
  } catch (err) {
    throw new AmplifyUserError('DatabaseUrlParseError', {
      message: `Unable to parse the database URL`,
      resolution: 'Check if the database URL is correct and accessible.',
    });
  }
};
