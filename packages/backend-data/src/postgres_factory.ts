import { DataProps, DataSchemaInput } from './types.js';
import { DatabaseProvider } from './providers/types.js';
import { defineData } from './factory.js';

/**
 * Props for PostgreSQL-specific data definitions
 */
export type PostgresDataProps = Omit<DataProps, 'schema' | 'database'> & {
  /**
   * Database provider (Aurora or RDS)
   */
  provider: DatabaseProvider;

  /**
   * Graphql Schema generated from PostgreSQL database
   */
  schema: DataSchemaInput;
};

/**
 * Define PostgreSQL-backed Amplify Data API
 *
 * This is a convenience wrapper around defineData that simplifies
 * PostgreSQL database configuration.
 * @example
 * ```ts
 * import { definePostgresData, aurora } from '@aws-amplify/backend-data';
 * import { schema } from './schema.sql.ts';
 *
 * export const data = definePostgresData({
 *   provider: aurora({ provision: { databaseName: 'mydb' } }),
 *   schema
 * });
 * ```
 */
export const definePostgresData = (props: PostgresDataProps) => {
  const { provider, schema, ...rest } = props;

  return defineData({
    ...rest,
    schema,
    database: {
      provider,
    },
  });
};
