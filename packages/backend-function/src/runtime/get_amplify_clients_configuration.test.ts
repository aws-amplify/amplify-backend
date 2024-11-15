import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { NoSuchKey, S3, S3ServiceException } from '@aws-sdk/client-s3';

import { getAmplifyDataClientConfig } from './get_amplify_clients_configuration.js';

const validEnv = {
  AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME:
    'TEST_VALUE for AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME',
  AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY:
    'TEST_VALUE for AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY',
  AWS_ACCESS_KEY_ID: 'TEST_VALUE for AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'TEST_VALUE for AWS_SECRET_ACCESS_KEY',
  AWS_SESSION_TOKEN: 'TEST_VALUE for AWS_SESSION_TOKEN',
  AWS_REGION: 'TEST_VALUE for AWS_REGION',
  AMPLIFY_DATA_GRAPHQL_ENDPOINT: 'TEST_VALUE for AMPLIFY_DATA_GRAPHQL_ENDPOINT',
};

let mockS3Client: S3;

void describe('getAmplifyDataClientConfig', () => {
  beforeEach(() => {
    mockS3Client = new S3();
  });

  Object.keys(validEnv).forEach((envFieldToExclude) => {
    void it(`returns empty config objects when ${envFieldToExclude} is not included`, async () => {
      const env = { ...validEnv } as Record<string, string>;
      delete env[envFieldToExclude];
      assert.deepEqual(await getAmplifyDataClientConfig(env), {
        resourceConfig: {},
        libraryOptions: {},
      });
    });

    void it(`returns empty config objects when ${envFieldToExclude} is not a string`, async () => {
      const env = { ...validEnv } as Record<string, unknown>;
      env[envFieldToExclude] = 123;
      assert.deepEqual(await getAmplifyDataClientConfig(env), {
        resourceConfig: {},
        libraryOptions: {},
      });
    });
  });

  void it('raises a custom error message when the model introspection schema is missing from the s3 bucket', async () => {
    const s3ClientSendMock = mock.method(mockS3Client, 'send', async () => {
      throw new NoSuchKey({ message: 'TEST_ERROR', $metadata: {} });
    });
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    await assert.rejects(
      async () => await getAmplifyDataClientConfig(validEnv, mockS3Client),
      new Error(
        'Error retrieving the schema from S3. Please confirm that your project has a `defineData` included in the `defineBackend` definition.'
      )
    );
  });

  void it('raises a custom error message when there is a S3ServiceException error retrieving the model introspection schema from the s3 bucket', async () => {
    const s3ClientSendMock = mock.method(mockS3Client, 'send', async () => {
      throw new S3ServiceException({
        name: 'TEST_ERROR',
        message: 'TEST_MESSAGE',
        $fault: 'server',
        $metadata: {},
      });
    });
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    await assert.rejects(
      async () => await getAmplifyDataClientConfig(validEnv, mockS3Client),
      new Error(
        'Error retrieving the schema from S3. You may need to grant this function authorization on the schema. TEST_ERROR: TEST_MESSAGE.'
      )
    );
  });

  void it('re-raises a non-S3 error received when retrieving the model introspection schema from the s3 bucket', async () => {
    const s3ClientSendMock = mock.method(mockS3Client, 'send', async () => {
      throw new Error('Test Error');
    });
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    await assert.rejects(
      async () => await getAmplifyDataClientConfig(validEnv, mockS3Client),
      new Error('Test Error')
    );
  });

  void it('returns the expected libraryOptions and resourceConfig values in the happy case', async () => {
    const s3ClientSendMock = mock.method(mockS3Client, 'send', () => {
      return Promise.resolve({
        Body: {
          transformToString: () => JSON.stringify({ testSchema: 'TESTING' }),
        },
      });
    });
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
      validEnv,
      mockS3Client
    );

    assert.deepEqual(
      await libraryOptions.Auth.credentialsProvider.getCredentialsAndIdentityId?.(),
      {
        credentials: {
          accessKeyId: 'TEST_VALUE for AWS_ACCESS_KEY_ID',
          secretAccessKey: 'TEST_VALUE for AWS_SECRET_ACCESS_KEY',
          sessionToken: 'TEST_VALUE for AWS_SESSION_TOKEN',
        },
      }
    );
    assert.deepEqual(
      await libraryOptions.Auth.credentialsProvider.clearCredentialsAndIdentityId?.(),
      undefined
    );

    assert.deepEqual(resourceConfig, {
      API: {
        GraphQL: {
          endpoint: 'TEST_VALUE for AMPLIFY_DATA_GRAPHQL_ENDPOINT',
          region: 'TEST_VALUE for AWS_REGION',
          defaultAuthMode: 'iam',
          modelIntrospection: { testSchema: 'TESTING' },
        },
      },
    });
  });
});
