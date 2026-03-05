import { BackendSecret } from '@aws-amplify/plugin-types';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';

/**
 * Database provider type
 */
export type ProviderType = 'aurora' | 'rds' | 'custom';

/**
 * Connection configuration as URI string
 */
export type ConnectionUri = {
  uri: BackendSecret;
};

/**
 * Structured connection configuration
 */
export type StructuredConnectionConfig = {
  host: BackendSecret | string;
  port: number;
  database: BackendSecret | string;
  username: BackendSecret | string;
  password: BackendSecret;
  ssl?: boolean | { ca?: string; rejectUnauthorized?: boolean };
};

/**
 * Connection configuration - either URI or structured
 */
export type ConnectionConfig = ConnectionUri | StructuredConnectionConfig;

/**
 * VPC configuration for Lambda functions
 */
export type VpcConfig = {
  vpc: IVpc;
  securityGroups?: ISecurityGroup[];
  allowPublicSubnet?: boolean;
};

/**
 * Security configuration for database access
 */
export type SecurityConfig = {
  allowedSecurityGroups?: ISecurityGroup[];
  allowedCidrBlocks?: string[];
};

/**
 * Base type for all database providers
 */
export type DatabaseProvider = {
  /**
   * Provider type identifier
   */
  readonly type: ProviderType;

  /**
   * Get connection configuration for the database
   */
  getConnectionConfig: () => ConnectionConfig;

  /**
   * Get VPC configuration for Lambda functions (if needed)
   */
  getVpcConfig: () => VpcConfig | undefined;

  /**
   * Get security configuration for database access
   */
  getSecurityConfig: () => SecurityConfig | undefined;
};

/**
 * Type for providers that can provision databases
 */
export type ProvisionedDatabaseProvider = {
  /**
   * Provision the database infrastructure
   */
  provision: () => void;

  /**
   * Whether provisioning is enabled
   */
  readonly shouldProvision: boolean;
} & DatabaseProvider;

/**
 * Type guard to check if provider can provision
 */
export const isProvisionedProvider = (
  provider: DatabaseProvider,
): provider is ProvisionedDatabaseProvider => {
  return 'provision' in provider && 'shouldProvision' in provider;
};

/**
 * Type guard to check if connection config is URI-based
 */
export const isConnectionUri = (
  config: ConnectionConfig,
): config is ConnectionUri => {
  return 'uri' in config;
};
