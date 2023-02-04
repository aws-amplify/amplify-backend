import { aws_iam, aws_lambda, aws_logs, CustomResource, custom_resources, Duration } from 'aws-cdk-lib';
import { Attribute, GlobalSecondaryIndexProps, ITable, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

import { Construct } from 'constructs';
import type { AttributeDefinition, AttributeDefinitions, CreateTableInput, GlobalSecondaryIndex, KeySchema } from 'aws-sdk/clients/dynamodb';
import {
  AmplifyCdkType,
  AmplifyCdkWrap,
  AmplifyInitializer,
  AmplifyPolicyContent,
  AmplifyServiceProvider,
  AmplifyServiceProviderFactory,
  DynamoTableBuilder,
  LambdaEventSource,
} from '../../types';
import { ResourceAccessPolicy, ResourceAccessPolicyList } from '../../manifest/manifest-zod';

export const init: AmplifyInitializer = (cdk: AmplifyCdkType) => {
  return new AmplifyDynamoDBProviderFactory(cdk);
};

class AmplifyDynamoDBProviderFactory implements AmplifyServiceProviderFactory {
  constructor(private readonly cdk: AmplifyCdkType) {}

  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider {
    return new AmplifyDynamoDBProvider(scope, name, this.cdk);
  }
}

export class AmplifyDynamoDBProvider extends AmplifyServiceProvider implements LambdaEventSource, DynamoTableBuilder {
  private gsis: GlobalSecondaryIndexProps[] = [];
  private tableProps: TableProps;
  private customTable: ITable;
  private streamHandler: AmplifyCdkWrap.aws_lambda.IFunction;
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
  }

  getAnnotatedConfigClass(): typeof TablePropsImpl {
    return TablePropsImpl;
  }

  init(config: TableProps) {
    if (config) {
      this.tableProps = config;
    }
  }

  setTableProps(props: TableProps) {
    this.tableProps = props;
  }

  addGlobalSecondaryIndex(props: GlobalSecondaryIndexProps) {
    this.gsis.push(props);
  }

  attachLambdaEventHandler(eventSourceName: 'stream', handler: aws_lambda.IFunction): void {
    if (eventSourceName !== 'stream') {
      throw new Error(`Unknown event source ${eventSourceName}`);
    }
    this.streamHandler = handler;
  }

  getPolicyContent(permissions: ResourceAccessPolicy): AmplifyPolicyContent {
    return {
      resourceArnToken: this.customTable.tableArn,
      resourceNameToken: this.customTable.tableName,
      resourceSuffixes: [],
      actions: ['DynamoDB:GetItem'],
    };
  }

  finalizeResources(): void {
    if (!this.tableProps) {
      throw new Error('setTableOptions must be called before buildTable');
    }
    // Policy that grants access to Create/Update/Delete DynamoDB tables
    const ddbManagerPolicy = new aws_iam.Policy(this, 'createUpdateDeleteTablesPolicy');
    ddbManagerPolicy.addStatements(
      new aws_iam.PolicyStatement({
        actions: ['dynamodb:CreateTable', 'dynamodb:UpdateTable', 'dynamodb:DeleteTable', 'dynamodb:DescribeTable'],
        resources: ['*'], // TODO scope this down
      })
    );

    const lambdaCode = aws_lambda.Code.fromAsset(path.join(__dirname, './custom-resource-lambda'));

    // lambda that will handle DDB CFN events
    const gsiOnEventHandler = new aws_lambda.Function(this, 'tableOnEventHandler', {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: 'custom-resource-handler.onEvent',
      timeout: Duration.minutes(1),
    });

    // lambda that will poll for provisioning to complete
    const gsiIsCompleteHandler = new aws_lambda.Function(this, 'tableIsCompleteHandler', {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: 'custom-resource-handler.isComplete',
      timeout: Duration.minutes(1),
    });

    ddbManagerPolicy.attachToRole(gsiOnEventHandler.role!);
    ddbManagerPolicy.attachToRole(gsiIsCompleteHandler.role!);

    const gsiCustomProvider = new custom_resources.Provider(this, 'tableCustomProvider', {
      onEventHandler: gsiOnEventHandler,
      isCompleteHandler: gsiIsCompleteHandler,
      logRetention: aws_logs.RetentionDays.ONE_MONTH,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.hours(2),
    });

    // this is the custom resource that manages GSI updates
    const gsiCustom = new CustomResource(this, 'custom-dynamo-table', {
      serviceToken: gsiCustomProvider.serviceToken,
      properties: this.toCreateTableInput(),
    });

    // construct a wrapper around the custom table to allow normal CDK operations on top of it
    this.customTable = Table.fromTableAttributes(this, 'custom-table', {
      tableArn: gsiCustom.getAttString('TableArn'),
      tableStreamArn: this.tableProps.stream ? gsiCustom.getAttString('TableStreamArn') : undefined,
      globalIndexes: this.gsis.map((gsi) => gsi.indexName),
    });

    if (this.streamHandler) {
      this.streamHandler.addEventSource(
        new this.cdk.aws_lambda_event_sources.DynamoEventSource(this.customTable, { startingPosition: this.cdk.aws_lambda.StartingPosition.LATEST })
      );
    }
  }

  private toCreateTableInput(): Omit<CreateTableInput, 'TableName'> {
    const attributeDefinitionsRecord: Record<string, AttributeDefinition> = {};
    this.toAttributeDefinitions(this.tableProps).forEach((def) => (attributeDefinitionsRecord[def.AttributeName] = def));

    const gsis = this.gsis.map((gsi): GlobalSecondaryIndex => {
      this.toAttributeDefinitions(gsi).forEach((def) => (attributeDefinitionsRecord[def.AttributeName] = def));
      return {
        IndexName: gsi.indexName,
        KeySchema: this.toKeySchema(gsi),
        Projection: {
          ProjectionType: 'ALL',
        },
      };
    });

    const createTableInput: Omit<CreateTableInput, 'TableName'> = {
      AttributeDefinitions: Object.values(attributeDefinitionsRecord),
      KeySchema: this.toKeySchema(this.tableProps),
      GlobalSecondaryIndexes: gsis,
      BillingMode: this.tableProps.billingMode,
      StreamSpecification: this.tableProps.stream
        ? {
            StreamEnabled: true,
            StreamViewType: this.tableProps.stream,
          }
        : undefined,
    };
    return createTableInput;
  }

  private toKeySchema({ partitionKey, sortKey }: { partitionKey: Attribute; sortKey?: Attribute }): KeySchema {
    const keySchema: KeySchema = [
      {
        AttributeName: partitionKey.name,
        KeyType: 'HASH',
      },
    ];
    if (sortKey) {
      keySchema.push({
        AttributeName: sortKey.name,
        KeyType: 'RANGE',
      });
    }
    return keySchema;
  }

  private toAttributeDefinitions({ partitionKey, sortKey }: { partitionKey: Attribute; sortKey?: Attribute }): AttributeDefinitions {
    const attributeDefinitions: AttributeDefinitions = [
      {
        AttributeName: partitionKey.name,
        AttributeType: partitionKey.type,
      },
    ];
    if (sortKey) {
      attributeDefinitions.push({
        AttributeName: sortKey.name,
        AttributeType: sortKey.type,
      });
    }
    return attributeDefinitions;
  }
}

class TablePropsImpl implements AmplifyCdkWrap.aws_dynamodb.TableProps {
  partitionKey: Attribute;
}
