import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
  IClusterEngine,
  ParameterGroup,
} from 'aws-cdk-lib/aws-rds';
// import type { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct';
import { IVpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { IDatabaseCluster } from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

const DEFAULT_DATABASE_NAME = 'postgres';

export class AmplifyDatabase extends Construct {
  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  /**
   * Generated L1 and L2 CDK resources.
   */
  public readonly resources: AmplifyDatabaseResources;

  /**
   * Data source strategy for Amplify GraphQL API
   */
  // public readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);

    const dataApiSecret = this.createDatabaseSecret('postgres');
    const consoleSecret = this.createDatabaseSecret('console');
    const databaseCluster = this.createDatabaseCluster(props, dataApiSecret);

    this.resources = {
      databaseCluster,
      dataApiSecret,
      consoleSecret,
    };

    // TOOD: change to new strategy
    // this.dataSourceStrategy = {
    //   name: 'AmplifyDatabaseDataSourceStrategy',
    //   dbType: props.dbType,
    //   dbConnectionConfig: {
    //     // use admin secret for data source
    //     // admin secret will always be created because we are not overriding the credentials in DatabaseCluster
    //     secretArn: databaseCluster.secret!.secretArn,
    //     // use default port
    //     port: 5432,
    //     databaseName: DEFAULT_DATABASE_NAME,
    //     hostname: databaseCluster.clusterEndpoint.hostname,
    //   },
    //   vpcConfiguration: {
    //     vpcId: databaseCluster.vpc.vpcId,
    //     // TODO: how to fix this
    //     // @ts-expect-error protected property
    //     securityGroupIds: databaseCluster.securityGroups.map((securityGroup) => securityGroup.securityGroupId),
    //     subnetAvailabilityZoneConfig: databaseCluster.vpc.publicSubnets,
    //   },
    // };
  }

  private createDatabaseSecret(username: string): DatabaseSecret {
    return new DatabaseSecret(this, `AmpDatabaseSecret-${username}`, {
      username,
      dbname: DEFAULT_DATABASE_NAME,
    });
  }

  private createDatabaseCluster(props: AmplifyDatabaseProps, secret: ISecret): DatabaseCluster {
    const parameterGroup = new ParameterGroup(this, 'AmplifyParameterGroup', {
      engine: this.getDatabaseClusterEngine(props.dbType),
      description: 'Amplify parameter group',
      parameters: {
        // Enable logical replication for Postgres to allow for Blue/Green deployments
        'rds.logical_replication': '1',
      },
    });
    const defaultSecurityGroup = SecurityGroup.fromLookupByName(
      this,
      'DefaultSecurityGroup',
      'default',
      props.vpc,
    );
    return new DatabaseCluster(this, 'AmplifyDatabaseCluster', {
      engine: this.getDatabaseClusterEngine(props.dbType),
      writer: ClusterInstance.serverlessV2('writer'),
      enableDataApi: true,
      defaultDatabaseName: DEFAULT_DATABASE_NAME,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      parameterGroup,
      credentials: rds.Credentials.fromSecret(secret),
      securityGroups: [
        defaultSecurityGroup
      ]
    });
  }

  private getDatabaseClusterEngine(dbType: DBType): IClusterEngine {
    switch (dbType) {
      // TODO: expose version as prop
      case 'POSTGRES':
        return DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_16_3 });
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}

/**
 * Input props for the AmplifyDatabase construct.
 */
export interface AmplifyDatabaseProps {
  readonly vpc: IVpc;
  readonly dbType: DBType;
}

export interface AmplifyDatabaseResources {
  /**
   * The database cluster created by the construct.
   */
  readonly databaseCluster: IDatabaseCluster;

  /**
   * Username and password for the data API user. The Data API user is used to apply migrations and run SQL queries.
   */
  readonly dataApiSecret: ISecret;

  /**
   * Username and password for the console user. The Console user is used in the "sandbox in the cloud" for development on DB schema.
   */
  readonly consoleSecret: ISecret;
}

export type DBType = 'POSTGRES';