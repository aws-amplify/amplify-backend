import { AttributeDefinitions, BillingMode, GlobalSecondaryIndexList, KeySchema, StreamSpecification } from "aws-sdk/clients/dynamodb";
import { instanceToPlain } from "class-transformer";
import { Construct } from "constructs";
import type { DDBConfig } from "./ddb-custom-config-type";
import { AmplifyCdkType, AmplifyCdkWrap, AmplifyConstruct, LambdaEventSource } from "../../types";

// TODO make construct here pulling from stuff below

export class DynamoConstruct extends AmplifyConstruct implements LambdaEventSource {
  private configuration: DynamoConfig;
  private streamHandler: AmplifyCdkWrap.aws_lambda.IFunction;
  constructor(scope: Construct, private readonly name: string, private readonly cdk: AmplifyCdkType) {
    super(scope, name);
  }

  getAnnotatedConfigClass(): typeof DynamoConfig {
    return DynamoConfig;
  }

  init(configuration: DynamoConfig): void {
    this.configuration = configuration;
  }

  attachLambdaEventHandler(eventSourceName: string, handler: AmplifyCdkWrap.aws_lambda.IFunction): void {
    if (eventSourceName !== "stream") {
      throw new Error(`Unknown event source ${eventSourceName}`);
    }
    this.configuration.StreamSpecification = {
      StreamEnabled: true,
      StreamViewType: this.cdk.aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    };

    this.streamHandler = handler;
  }

  finalize(): void {
    // Policy that grants access to Create/Update/Delete DynamoDB tables
    const ddbManagerPolicy = new this.cdk.aws_iam.Policy(this, "createUpdateDeleteTablesPolicy");
    ddbManagerPolicy.addStatements(
      new this.cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:CreateTable", "dynamodb:UpdateTable", "dynamodb:DeleteTable", "dynamodb:DescribeTable"],
        resources: ["*"], // TODO scope this down
      })
    );

    const lambdaCode = this.cdk.aws_lambda.Code.fromAsset("./lib/ddb-custom-handler");

    // lambda that will handle DDB CFN events
    const gsiOnEventHandler = new this.cdk.aws_lambda.Function(this, "tableOnEventHandler", {
      runtime: this.cdk.aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: "ddb-custom-handler.onEvent",
      timeout: this.cdk.Duration.minutes(1),
    });

    // lambda that will poll for provisioning to complete
    const gsiIsCompleteHandler = new this.cdk.aws_lambda.Function(this, "tableIsCompleteHandler", {
      runtime: this.cdk.aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: "ddb-custom-handler.isComplete",
      timeout: this.cdk.Duration.minutes(1),
    });

    ddbManagerPolicy.attachToRole(gsiOnEventHandler.role!);
    ddbManagerPolicy.attachToRole(gsiIsCompleteHandler.role!);

    const gsiCustomProvider = new this.cdk.custom_resources.Provider(this, "tableCustomProvider", {
      onEventHandler: gsiOnEventHandler,
      isCompleteHandler: gsiIsCompleteHandler,
      logRetention: this.cdk.aws_logs.RetentionDays.ONE_MONTH,
      queryInterval: this.cdk.Duration.seconds(30),
      totalTimeout: this.cdk.Duration.hours(2),
    });

    // this is the part that actually creates the new table resource
    const gsiCustom = new this.cdk.CustomResource(this, "customTable", {
      serviceToken: gsiCustomProvider.serviceToken,
      properties: instanceToPlain(this.configuration),
    });

    // TODO need to configure
    if (this.configuration.StreamSpecification) {
      // TODO currently this won't work
      // need to configure the custom lambda to return the streamArn from the table if it's enabled
      this.streamHandler.addEventSourceMapping("stream-handler", {
        eventSourceArn: gsiCustom.getAttString("streamArn"),
      });
      // TODO create policy granting the lambda access to the stream
      // TODO attach that policy to the lambda execution role
    }
  }
}

class DynamoConfig implements DDBConfig {
  TableName: string;
  AttributeDefinitions: AttributeDefinitions;
  KeySchema: KeySchema;
  GlobalSecondaryIndexes: GlobalSecondaryIndexList;
  BillingMode: BillingMode;
  StreamSpecification?: StreamSpecification;
}

const exampleConfig: DDBConfig = {
  // todo how to generate a good name here?
  TableName: "ddb-plus",
  AttributeDefinitions: [
    {
      AttributeName: "pk",
      AttributeType: "S",
    },
    {
      AttributeName: "sk",
      AttributeType: "S",
    },
    {
      AttributeName: "newKey",
      AttributeType: "S",
    },
  ],
  KeySchema: [
    {
      AttributeName: "pk",
      KeyType: "HASH",
    },
  ],
  BillingMode: "PAY_PER_REQUEST",
  GlobalSecondaryIndexes: [
    {
      IndexName: "gsi2",
      KeySchema: [
        {
          AttributeName: "sk",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
    {
      IndexName: "gsi3",
      KeySchema: [
        {
          AttributeName: "newKey",
          KeyType: "HASH",
        },
      ],
      Projection: {
        ProjectionType: "ALL",
      },
    },
  ],
};
