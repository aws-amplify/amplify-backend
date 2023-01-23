import { Construct } from "constructs";
import { AmplifyCdkType, AmplifyServiceProvider, AmplifyServiceProviderFactory, AmplifyInitializer, DynamoTableBuilder } from "../../types";

export const init: AmplifyInitializer = (awsCdkLib: AmplifyCdkType) => {
  return new AmplifyAppSyncProviderFactory(awsCdkLib);
};

class AmplifyAppSyncProviderFactory implements AmplifyServiceProviderFactory {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}

  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider {
    return new AmplifyAppSyncProvider(scope, name, this.awsCdkLib);
  }
}

class AmplifyAppSyncProvider extends AmplifyServiceProvider {
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
  }

  getAnnotatedConfigClass(): typeof AmplifyAppSyncConfiguration {
    return AmplifyAppSyncConfiguration;
  }

  init(config: AmplifyAppSyncConfiguration) {
    const appsync = this.cdk.aws_appsync;
    const dynamodb = this.cdk.aws_dynamodb;

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "demo",
      schema: appsync.SchemaFile.fromAsset(config.schema),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      xrayEnabled: true,
    });

    const demoTable = new dynamodb.Table(this, "DemoTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const demoDS = api.addDynamoDbDataSource("demoDataSource", demoTable);

    // Resolver for the Query "getDemos" that scans the DynamoDb table and returns the entire list.
    // Resolver Mapping Template Reference:
    // https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html
    demoDS.createResolver("QueryGetDemosResolver", {
      typeName: "Query",
      fieldName: "getDemos",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Resolver for the Mutation "addDemo" that puts the item into the DynamoDb table.
    demoDS.createResolver("MutationAddDemoResolver", {
      typeName: "Mutation",
      fieldName: "addDemo",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(appsync.PrimaryKey.partition("id").auto(), appsync.Values.projecting("input")),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });
  }

  finalize(): void {
    // noop for now. But eventually there will be logic here
  }
}
type IAmplifyAppSyncConfiguration = {
  schema: string;
};

class AmplifyAppSyncConfiguration implements IAmplifyAppSyncConfiguration {
  schema: string;
  authenticationTypes: string[]; // right now just API_KEY
}
