import { Construct } from 'constructs';
import { ConstructAdaptor, ConstructAdaptorFactory, AmplifyInitializer } from '../../types';
import { aws_appsync as appsync, aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { z } from 'zod';

/**
 * A basic stub of creating a GQL API
 * @param awsCdkLib
 * @returns
 */
export const init: AmplifyInitializer = () => {
  return new AmplifyAppSyncAdaptorFactory();
};

class AmplifyAppSyncAdaptorFactory implements ConstructAdaptorFactory {
  constructor() {}

  getConstructAdaptor(scope: Construct, name: string): ConstructAdaptor {
    return new AmplifyAppSyncAdaptor(scope, name);
  }
}

class AmplifyAppSyncAdaptor extends ConstructAdaptor {
  constructor(scope: Construct, private readonly name: string) {
    super(scope, name);
  }

  getDefinitionSchema() {
    return inputSchema;
  }

  init(config: InputSchema) {
    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'demo',
      schema: appsync.SchemaFile.fromAsset(config.relativeSchemaPath),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      xrayEnabled: true,
    });

    const demoTable = new dynamodb.Table(this, 'DemoTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const demoDS = api.addDynamoDbDataSource('demoDataSource', demoTable);

    // Resolver for the Query "getDemos" that scans the DynamoDb table and returns the entire list.
    // Resolver Mapping Template Reference:
    // https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html
    demoDS.createResolver('QueryGetDemosResolver', {
      typeName: 'Query',
      fieldName: 'getDemos',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Resolver for the Mutation "addDemo" that puts the item into the DynamoDb table.
    demoDS.createResolver('MutationAddDemoResolver', {
      typeName: 'Mutation',
      fieldName: 'addDemo',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(appsync.PrimaryKey.partition('id').auto(), appsync.Values.projecting('input')),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });
  }

  finalizeResources(): void {
    // noop for now. But eventually there will be logic here
  }
}

const inputSchema = z.object({
  relativeSchemaPath: z.string(),
});

type InputSchema = z.infer<typeof inputSchema>;
