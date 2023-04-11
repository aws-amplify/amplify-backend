import { App, aws_dynamodb, Stack } from 'aws-cdk-lib';
import { AmplifyDynamoDBProvider } from './providers/dynamodb/dynamodb-provider';

const app = new App();
const stack = new Stack(app, 'test-stack');

const ddbProvider = new AmplifyDynamoDBProvider(stack, 'ddb-test');
ddbProvider.setTableProps({
  billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  partitionKey: {
    name: 'pk',
    type: aws_dynamodb.AttributeType.STRING,
  },
});
ddbProvider.addGlobalSecondaryIndex({
  indexName: 'new-index',
  partitionKey: {
    name: 'something',
    type: aws_dynamodb.AttributeType.STRING,
  },
});
ddbProvider.finalizeResources();
