import { Amplify } from 'aws-amplify';
import { downloadData, uploadData } from 'aws-amplify/storage';

// Configure the Amplify client with the storage and auth loaded from the lambda execution role
Amplify.configure(
  {
    Storage: {
      S3: {
        bucket: process.env.testName_BUCKET_NAME,
        region: process.env.AWS_REGION,
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sessionToken: process.env.AWS_SESSION_TOKEN!,
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
    testSecret: process.env.TEST_SECRET,
    testSharedSecret: process.env.TEST_SHARED_SECRET,
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
