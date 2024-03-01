import { Amplify } from 'aws-amplify';
import { downloadData, uploadData } from 'aws-amplify/storage';
/**
 * This import is for tests to use the generated type generation file.
 * Currently we only use defaultNodeFunction because node16Function has the same environment variables at runtime.
 */
import { env } from '@env/defaultNodeFunction.js';

// Configure the Amplify client with the storage and auth loaded from the lambda execution role
Amplify.configure(
  {
    Storage: {
      S3: {
        bucket: process.env.testName_BUCKET_NAME,
        region: env.AWS_REGION,
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
          // this can be anything
          identityId: '1234567890',
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  }
);

/**
 * Function to test building a lambda that has an import and loads auto-resolved env vars
 */
export const getResponse = async () => {
  return {
    s3TestContent: await s3RoundTrip(),
    testSecret: env.TEST_SECRET,
    testSharedSecret: env.TEST_SHARED_SECRET,
  };
};

/**
 * Test that the lambda is able to upload and download using aws-amplify
 * @returns test content from s3
 */
const s3RoundTrip = async (): Promise<string> => {
  const filename = 'test.txt';
  await uploadData({
    key: filename,
    data: 'this is some test content',
    options: {
      accessLevel: 'guest',
    },
  }).result;

  const downloadResult = await downloadData({
    key: filename,
    options: { accessLevel: 'guest' },
  }).result;
  return downloadResult.body.text() as Promise<string>;
};
