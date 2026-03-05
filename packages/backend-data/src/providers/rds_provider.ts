import { BackendSecret } from '@aws-amplify/plugin-types';
import {
  ConnectionConfig,
  DatabaseProvider,
  SecurityConfig,
  StructuredConnectionConfig,
  VpcConfig,
} from './types.js';

/**
 * RDS provider configuration
 */
export type RDSProviderConfig =
  | {
      connectionUri: BackendSecret;
    }
  | StructuredConnectionConfig;

/**
 * RDS database provider for existing RDS instances
 */
export class RDSProvider implements DatabaseProvider {
  readonly type = 'rds' as const;

  /**
   * Creates an RDS database provider
   */
  constructor(private readonly config: RDSProviderConfig) {}

  /**
   * Get connection configuration for the database
   */
  getConnectionConfig(): ConnectionConfig {
    if ('connectionUri' in this.config) {
      return { uri: this.config.connectionUri };
    }
    return this.config;
  }

  /**
   * Get VPC configuration for Lambda functions.
   * Returns undefined because RDS provider connects to existing instances
   * where VPC config must be managed externally.
   */
  getVpcConfig(): VpcConfig | undefined {
    return undefined;
  }

  /**
   * Get security configuration for database access.
   * Returns undefined — security groups for existing RDS instances
   * are managed outside of Amplify.
   */
  getSecurityConfig(): SecurityConfig | undefined {
    return undefined;
  }
}

/**
 * Helper function to create RDS provider
 */
export const rds = (config: RDSProviderConfig): RDSProvider => {
  return new RDSProvider(config);
};
