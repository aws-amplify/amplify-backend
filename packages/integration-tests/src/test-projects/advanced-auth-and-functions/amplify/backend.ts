import { defineBackend } from '@aws-amplify/backend';
import { authAndFunctions } from './test_factories.js';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';

const backend = defineBackend(authAndFunctions);

const scheduleFunctionLambda = backend.funcWithSchedule.resources.lambda;
const scheduleFunctionLambdaRole = scheduleFunctionLambda.role;
const queueStack = Stack.of(scheduleFunctionLambda);

const queue = new Queue(queueStack, 'amplify-testFuncQueue');

if (scheduleFunctionLambdaRole) {
  queue.grantSendMessages(
    Role.fromRoleArn(
      queueStack,
      'LambdaExecutionRole',
      scheduleFunctionLambdaRole.roleArn,
    ),
  );
}
backend.funcWithSchedule.addEnvironment('SQS_QUEUE_URL', queue.queueUrl);

// Queue setup for customEmailSender
const customEmailSenderLambda = backend.funcCustomEmailSender.resources.lambda;
const customEmailSenderLambdaRole = customEmailSenderLambda.role;
const customEmailSenderQueueStack = Stack.of(customEmailSenderLambda);
const emailSenderQueue = new Queue(
  customEmailSenderQueueStack,
  'amplify-customEmailSenderQueue',
);

if (customEmailSenderLambdaRole) {
  emailSenderQueue.grantSendMessages(
    Role.fromRoleArn(
      customEmailSenderQueueStack,
      'CustomEmailSenderLambdaExecutionRole',
      customEmailSenderLambdaRole.roleArn,
    ),
  );
}
backend.funcCustomEmailSender.addEnvironment(
  'CUSTOM_SENDER_SQS_QUEUE_URL',
  emailSenderQueue.queueUrl,
);

// Queue setup for customSmsSender
const customSmsSenderLambda = backend.funcCustomSmsSender.resources.lambda;
const customSmsSenderLambdaRole = customSmsSenderLambda.role;
const customSmsSenderQueueStack = Stack.of(customSmsSenderLambda);
const smsSenderQueue = new Queue(
  customSmsSenderQueueStack,
  'amplify-customSmsSenderQueue',
);

if (customSmsSenderLambdaRole) {
  smsSenderQueue.grantSendMessages(
    Role.fromRoleArn(
      customSmsSenderQueueStack,
      'CustomSmsSenderLambdaExecutionRole',
      customSmsSenderLambdaRole.roleArn,
    ),
  );
}
backend.funcCustomSmsSender.addEnvironment(
  'CUSTOM_SENDER_SQS_QUEUE_URL',
  smsSenderQueue.queueUrl,
);
