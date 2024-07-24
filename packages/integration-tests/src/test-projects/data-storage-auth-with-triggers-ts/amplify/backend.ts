import { defineBackend } from '@aws-amplify/backend';
import { dataStorageAuthWithTriggers } from './test_factories.js';
import { Queue } from 'aws-cdk-lib/aws-sqs';

const backend = defineBackend(dataStorageAuthWithTriggers);
backend.defaultNodeFunc.addEnvironment('newKey', 'newValue');

const queueStack = backend.createStack('queueStack');
const queueName = 'amplify-testFuncQueue';
const scheduleLambda = backend.funcWithSchedule;

const queue = new Queue(queueStack, queueName, { queueName });

queue.grantSendMessages(scheduleLambda.resources.lambda);
scheduleLambda.addEnvironment('SQS_QUEUE_URL', queue.queueUrl);
