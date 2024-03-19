import { TypescriptDataSchemaGenerator } from '@aws-amplify/graphql-schema-generator';
import fs from 'fs/promises';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type SchemaGeneratorConfig = {
  connectionString: string;
  out: string;
};

type AmplifyGenerateSchemaError =
  | 'DatabaseConnectionError'
  | 'DatabaseUrlParseError';

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
        throw new AmplifyUserError<AmplifyGenerateSchemaError>(
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

export type SQLEngine = 'mysql' | 'postgresql';

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
 * This class is intended to be used for casting database connection errors.
 * Do not create instances of this class directly.
 */
abstract class DatabaseConnectError extends Error {
  /**
   * Creates database connection error.
   */
  constructor(readonly code?: string) {
    super(`Database connection error: ${code}`);
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
      throw new AmplifyUserError<AmplifyGenerateSchemaError>(
        'DatabaseUrlParseError',
        {
          message: `One or more parts of the database URL is missing. Missing [${missingParts.join(
            ', '
          )}].`,
          resolution:
            'Database URL must follow the pattern "[mysql|postgresql]://username:password@hostname:port/database".',
        }
      );
    }

    return config;
  } catch (err) {
    const error = err as Error;
    throw new AmplifyUserError<AmplifyGenerateSchemaError>(
      'DatabaseUrlParseError',
      {
        message: `Unable to parse the database URL. ${error.message}`,
        resolution: 'Check if the database URL is correct and accessible.',
      }
    );
  }
};
