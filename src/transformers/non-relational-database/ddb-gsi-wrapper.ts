import { Stack, ResourceEnvironment, RemovalPolicy, aws_dynamodb } from "aws-cdk-lib";
import { MetricOptions, Metric, IMetric } from "aws-cdk-lib/aws-cloudwatch";
import { GlobalSecondaryIndexProps, ITable, OperationsMetricOptions, SchemaOptions, SystemErrorsForOperationsMetricOptions, Table } from "aws-cdk-lib/aws-dynamodb";
import { IGrantable, Grant } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { DynamoDB } from "aws-sdk";
import { Construct, Node } from "constructs";

export class MultiGsiTable extends Construct {
  private builtTable: Table;
  private gsis: GlobalSecondaryIndexProps[] = [];
  constructor(scope: Construct, private readonly name: string) {
    super(scope, name);
  }
  setPrimaryIndex(schema: SchemaOptions) {}

  setGlobalSecondaryIndex(props: GlobalSecondaryIndexProps) {}

  buildTable(): Table {
    if (!this.builtTable) {
      this.builtTable = new aws_dynamodb.Table(this, this.name, {
        partitionKey: 
      })
    }
    return this.builtTable;
  }
}
