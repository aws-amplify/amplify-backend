import { Construct } from 'constructs';
import { AmplifyCdkType, ConstructAdaptor, ConstructAdaptorFactory, AmplifyInitializer, DynamoTableBuilder, aZod } from '../../types';

export const init: AmplifyInitializer = (awsCdkLib: AmplifyCdkType) => {
  return new AmplifyAppSyncProviderFactory(awsCdkLib);
};

class AmplifyAppSyncProviderFactory implements ConstructAdaptorFactory {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}

  getConstructAdaptor(scope: Construct, name: string): ConstructAdaptor {
    return new AmplifyAppSyncProvider(scope, name, this.awsCdkLib);
  }
}

class AmplifyAppSyncProvider extends ConstructAdaptor {
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
  }

  getDefinitionSchema() {
    return inputSchema;
  }

  init(config: InputSchema) {
    const appsync = this.cdk.aws_appsync;
    const dynamodb = this.cdk.aws_dynamodb;

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

const inputSchema = aZod.object({
  relativeSchemaPath: aZod.string(),
});

type InputSchema = aZod.infer<typeof inputSchema>;
