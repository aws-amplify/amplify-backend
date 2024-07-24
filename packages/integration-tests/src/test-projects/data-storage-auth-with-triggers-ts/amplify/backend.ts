import { defineBackend } from '@aws-amplify/backend';
import { dataStorageAuthWithTriggers } from './test_factories.js';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';

const backend = defineBackend(dataStorageAuthWithTriggers);
backend.defaultNodeFunc.addEnvironment('newKey', 'newValue');

const scheduleFunctionLambda = backend.funcWithSchedule.resources.lambda;
const scheduleFunctionLambdaRole = scheduleFunctionLambda.role;
const queueStack = Stack.of(scheduleFunctionLambda);

const queue = new Queue(queueStack, 'amplify-testFuncQueue');

if (scheduleFunctionLambdaRole) {
  queue.grantSendMessages(
    Role.fromRoleArn(
      queueStack,
      'LambdaExecutionRole',
      scheduleFunctionLambdaRole.roleArn
    )
  );
}
backend.funcWithSchedule.addEnvironment('SQS_QUEUE_URL', queue.queueUrl);
