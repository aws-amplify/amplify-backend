import { TypescriptDataSchemaGenerator } from '@aws-amplify/graphql-schema-generator';
import fs from 'fs/promises';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type SchemaGeneratorConfig = {
  connectionUri: {
    secretName: string;
    value: string;
  };
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
    const dbConfig = parseDatabaseUrl(props.connectionUri.value);

    try {
      const schema = await TypescriptDataSchemaGenerator.generate({
        ...dbConfig,
        connectionUriSecretName: props.connectionUri.secretName,
      });
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
const DEFAULT_ENGINE = 'mysql';

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
    // Default engine is MySQL
    const engine = constructDBEngine(
      parsedDatabaseUrl?.protocol?.slice(0, -1) ?? DEFAULT_ENGINE
    );
    const port = parsedDatabaseUrl?.port
      ? parseInt(parsedDatabaseUrl?.port, 10)
      : getDefaultPort(engine);

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
            'Ensure the database URL follows the pattern "[mysql|postgresql]://username:password@hostname:port/database".',
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

const constructDBEngine = (engine: string): SQLEngine => {
  switch (engine) {
    case 'mysql':
      return 'mysql';
    case 'postgresql':
    case 'postgres':
      return 'postgresql';
    default:
      throw new Error(`Unsupported database engine: ${engine}`);
  }
};

const getDefaultPort = (engine: SQLEngine): number => {
  switch (engine) {
    case 'mysql':
      return 3306;
    case 'postgresql':
      return 5432;
  }
};
