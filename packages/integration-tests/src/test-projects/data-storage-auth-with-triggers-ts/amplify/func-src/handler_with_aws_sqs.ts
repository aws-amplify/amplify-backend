import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { timeStamp } from 'console';

/**
 * This function asserts that schedule functions are working properly
 */
export const handler = async () => {
  const sqsClient = new SQSClient({ region: process.env.region });

  const queueUrl = process.env.SQS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error('SQS_QUEUE_URL is not set in environment variables');
  }

  try {
    const messageBody = JSON.stringify({
      message: 'Test message from Lambda',
      timeStamp: new Date().toISOString(),
    });

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      })
    );
  } catch (err) {
    throw err;
  }
};
