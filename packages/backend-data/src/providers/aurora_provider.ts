import { BackendIdentifier, BackendSecret } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import {
  ConnectionConfig,
  ProvisionedDatabaseProvider,
  SecurityConfig,
  VpcConfig,
} from './types.js';
import { AuroraConstruct, AuroraConstructProps } from './aurora_construct.js';

/**
 * Configuration for Aurora provisioning
 */
export type AuroraProvisionConfig = {
  /**
   * Database name to create
   */
  databaseName?: string;

  /**
   * VPC to deploy Aurora in (creates default VPC if not provided)
   */
  vpcId?: string;

  /**
   * Minimum capacity units for Aurora Serverless v2
   * @default 0.5
   */
  minCapacity?: number;

  /**
   * Maximum capacity units for Aurora Serverless v2
   * @default 1
   */
  maxCapacity?: number;
};

/**
 * Aurora provider configuration
 */
export type AuroraProviderConfig = {
  /**
   * Connection URI secret (for existing Aurora cluster)
   */
  connectionUri?: BackendSecret;

  /**
   * Provisioning configuration (for new Aurora cluster)
   */
  provision?: AuroraProvisionConfig;
};

/**
 * Aurora database provider
 */
export class AuroraProvider implements ProvisionedDatabaseProvider {
  readonly type = 'aurora' as const;
  readonly shouldProvision: boolean;

  private construct?: AuroraConstruct;

  /**
   * Creates an Aurora database provider
   */
  constructor(private readonly config: AuroraProviderConfig) {
    this.shouldProvision = !!config.provision;

    if (!config.connectionUri && !config.provision) {
      throw new Error(
        'Aurora provider requires either connectionUri or provision config',
      );
    }
  }

  /**
   * Provision the Aurora cluster.
   * No-op: actual provisioning happens in {@link createConstruct} during CDK synthesis.
   * This method exists to satisfy the {@link ProvisionedDatabaseProvider} interface.
   */
  provision(): void {
    // Intentionally empty — createConstruct() handles provisioning
  }

  /**
   * Set the CDK construct after provisioning
   */
  setConstruct(construct: AuroraConstruct): void {
    this.construct = construct;
  }

  /**
   * Create the Aurora CDK construct with all infrastructure resources.
   * @param scope - CDK scope to create the construct in
   * @param id - Construct ID
   * @param backendIdentifier - Amplify backend identifier, used to generate
   *   SSM parameter paths that the SQL Lambda reads at runtime
   */
  createConstruct(
    scope: Construct,
    id: string,
    backendIdentifier: BackendIdentifier,
  ): AuroraConstruct {
    if (!this.config.provision) {
      throw new Error('Cannot create construct without provision config');
    }

    const props: AuroraConstructProps = {
      databaseName: this.config.provision.databaseName || 'amplify',
      minCapacity: this.config.provision.minCapacity || 0.5,
      maxCapacity: this.config.provision.maxCapacity || 1,
      vpcId: this.config.provision.vpcId,
      backendIdentifier,
    };

    this.construct = new AuroraConstruct(scope, id, props);
    return this.construct;
  }

  /**
   * Get connection configuration for the database
   */
  getConnectionConfig(): ConnectionConfig {
    if (this.construct) {
      return {
        uri: this.construct.connectionSecret,
      };
    }

    if (this.config.connectionUri) {
      return {
        uri: this.config.connectionUri,
      };
    }

    throw new Error('Aurora provider not initialized');
  }

  /**
   * Get VPC configuration for Lambda functions
   */
  getVpcConfig(): VpcConfig | undefined {
    return this.construct?.getVpcConfig();
  }

  /**
   * Get security configuration for database access
   */
  getSecurityConfig(): SecurityConfig | undefined {
    return this.construct?.getSecurityConfig();
  }
}

/**
 * Helper function to create Aurora provider
 */
export const aurora = (config: AuroraProviderConfig): AuroraProvider => {
  return new AuroraProvider(config);
};
