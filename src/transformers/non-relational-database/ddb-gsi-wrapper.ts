import { aws_dynamodb, aws_iam, aws_lambda, aws_logs, CustomResource, custom_resources, Duration } from "aws-cdk-lib";
import { GlobalSecondaryIndexProps, TableProps } from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

import { Construct } from "constructs";
import { CreateTableInput } from "aws-sdk/clients/dynamodb";

export class MultiGsiTable extends Construct {
  private gsis: GlobalSecondaryIndexProps[] = [];
  private tableProps: TableProps;
  constructor(scope: Construct, private readonly name: string) {
    super(scope, name);
  }
  setTableOptions(props: TableProps) {
    this.tableProps = props;
  }

  addGlobalSecondaryIndex(props: GlobalSecondaryIndexProps) {
    this.gsis.push(props);
  }

  private toCreateTableInput(): CreateTableInput {}

  buildTable(): void {
    // this creates the table without any GSIs
    const table = new aws_dynamodb.Table(this, this.name, this.tableProps);

    // Policy that grants access to Create/Update/Delete DynamoDB tables
    const ddbManagerPolicy = new aws_iam.Policy(this, "createUpdateDeleteTablesPolicy");
    ddbManagerPolicy.addStatements(
      new aws_iam.PolicyStatement({
        actions: ["dynamodb:CreateTable", "dynamodb:UpdateTable", "dynamodb:DeleteTable", "dynamodb:DescribeTable"],
        resources: ["*"], // TODO scope this down
      })
    );

    const lambdaCode = aws_lambda.Code.fromAsset(path.join(__dirname, "./custom-lambda"));

    // lambda that will handle DDB CFN events
    const gsiOnEventHandler = new aws_lambda.Function(this, "tableOnEventHandler", {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: "ddb-custom-handler.onEvent",
      timeout: Duration.minutes(1),
    });

    // lambda that will poll for provisioning to complete
    const gsiIsCompleteHandler = new aws_lambda.Function(this, "tableIsCompleteHandler", {
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      code: lambdaCode,
      handler: "ddb-custom-handler.isComplete",
      timeout: Duration.minutes(1),
    });

    ddbManagerPolicy.attachToRole(gsiOnEventHandler.role!);
    ddbManagerPolicy.attachToRole(gsiIsCompleteHandler.role!);

    const gsiCustomProvider = new custom_resources.Provider(this, "tableCustomProvider", {
      onEventHandler: gsiOnEventHandler,
      isCompleteHandler: gsiIsCompleteHandler,
      logRetention: aws_logs.RetentionDays.ONE_MONTH,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.hours(2),
    });

    // this is the custom resource that manages GSI updates

    const customResourceInput: CustomGsiHandlerParameters = {
      tableName: table.tableName,
      gsiDefinitions: this.gsis,
    };

    const gsiCustom = new CustomResource(this, "gsiManager", {
      serviceToken: gsiCustomProvider.serviceToken,
      properties: customResourceInput,
    });
  }
}

export type CustomGsiHandlerParameters = {
  tableName: string;
  gsiDefinitions: GlobalSecondaryIndexProps[];
};
