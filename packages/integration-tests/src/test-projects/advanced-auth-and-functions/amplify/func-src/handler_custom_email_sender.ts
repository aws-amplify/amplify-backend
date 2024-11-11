import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

/**
 * This function asserts that custom email sender function is working properly
 */
export const handler = async () => {
  const sqsClient = new SQSClient({ region: process.env.region });

  const queueUrl = process.env.CUSTOM_EMAIL_SENDER_SQS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error('SQS_QUEUE_URL is not set in environment variables');
  }

  const messageBody = JSON.stringify({
    message: 'Custom Email Sender is working',
    timeStamp: new Date().toISOString(),
  });

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    })
  );

  return 'It is working';
};
