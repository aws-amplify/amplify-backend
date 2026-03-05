/**
 * Generate provider configuration code snippet
 */
export const generateProviderCode = (options: {
  provider?: 'aurora' | 'rds';
  connectionUriSecret: string;
  auroraProvision?: boolean;
}): string => {
  const { provider, connectionUriSecret, auroraProvision } = options;

  if (!provider) {
    return '';
  }

  const secretRef = `secret('${connectionUriSecret}')`;

  switch (provider) {
    case 'aurora':
      if (auroraProvision) {
        return `
// Provider configuration
import { definePostgresData, aurora } from '@aws-amplify/backend';

export const data = definePostgresData({
  provider: aurora({
    provision: {
      databaseName: 'mydb', // Change to your database name
      minCapacity: 0.5,
      maxCapacity: 1,
    },
  }),
  schema,
});`;
      }
      return `
// Provider configuration
import { definePostgresData, aurora, secret } from '@aws-amplify/backend';

export const data = definePostgresData({
  provider: aurora({
    connectionUri: ${secretRef},
  }),
  schema,
});`;

    case 'rds':
      return `
// Provider configuration
import { definePostgresData, rds, secret } from '@aws-amplify/backend';

export const data = definePostgresData({
  provider: rds({
    connectionUri: ${secretRef},
  }),
  schema,
});`;

    default:
      return '';
  }
};
