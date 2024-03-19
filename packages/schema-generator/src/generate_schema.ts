import { TypescriptDataSchemaGenerator } from '@aws-amplify/graphql-schema-generator';
import fs from 'fs/promises';
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
      await fs.writeFile(props.out, schema);
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
      throw err;
    }
  };
}

// eslint-disable-next-line spellcheck/spell-checker
export type MySQLEngine = 'mysql';
// eslint-disable-next-line spellcheck/spell-checker
export type PostgresSQLEngine = 'postgresql';
// eslint-disable-next-line spellcheck/spell-checker
export type SQLEngine = MySQLEngine | PostgresSQLEngine;

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
  // eslint-disable-next-line spellcheck/spell-checker
  constructor(readonly code: string, readonly errorno: string) {
    // eslint-disable-next-line spellcheck/spell-checker
    super(`Database connection error: ${code} ${errorno}`);
  }
}

/**
 * Parses database URL into a configuration object.
 */
export const parseDatabaseUrl = (databaseUrl: string): SQLDataSourceConfig => {
  try {
    const parsedDatabaseUrl = new URL(databaseUrl);
    const {
      username: encodedUsername,
      password: encodedPassword,
      hostname: encodedHost,
    } = parsedDatabaseUrl;
    const username = decodeURIComponent(encodedUsername);
    const password = decodeURIComponent(encodedPassword);
    const host = decodeURIComponent(encodedHost);
    const database = decodeURIComponent(parsedDatabaseUrl?.pathname?.slice(1));
    const port = parseInt(parsedDatabaseUrl?.port, 10);
    const engine = parsedDatabaseUrl?.protocol?.slice(0, -1) as SQLEngine;

    const config = {
      engine,
      username,
      password,
      database,
      host,
      port,
    } as SQLDataSourceConfig;

    const missingParts = (
      Object.keys(config) as Array<keyof SQLDataSourceConfig>
    ).filter((part) => !config[part]);

    if (missingParts.length > 0) {
      throw new Error(
        `One or more parts of the database URL is missing. Missing [${missingParts.join(
          ', '
        )}].`
      );
    }

    return config;
  } catch (err) {
    const error = err as Error;
    throw new AmplifyUserError('DatabaseUrlParseError', {
      message: `Unable to parse the database URL. ${error.message}`,
      resolution: 'Check if the database URL is correct and accessible.',
    });
  }
};
