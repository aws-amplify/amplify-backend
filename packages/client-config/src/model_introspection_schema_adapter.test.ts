import assert from 'assert';
import { beforeEach, describe, it } from 'node:test';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapter.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

const stubClientProvider = {
  getS3Client: () => new S3Client(),
  getAmplifyClient: () => new AmplifyClient(),
  getCloudFormationClient: () => new CloudFormationClient(),
};
void describe('ModelIntrospectionSchemaAdapter', () => {
  const s3Mock = mockClient(S3Client);

  void beforeEach(() => {
    s3Mock.reset();
  });

  void it('returns undefined on undefined schema uri', async () => {
    const modelIntrospectionSchema = await new ModelIntrospectionSchemaAdapter(
      stubClientProvider
    ).getModelIntrospectionSchemaFromS3Uri(undefined);
    assert.deepEqual(modelIntrospectionSchema, undefined);
  });

  void it('throws on invalid s3 location', async () => {
    await assert.rejects(() =>
      new ModelIntrospectionSchemaAdapter(
        stubClientProvider
      ).getModelIntrospectionSchemaFromS3Uri('s3://im_a_fake_bucket/i_swear')
    );
  });

  void it('produces a model schema given a valid s3 uri', async () => {
    // create Stream from string
    const stream = new Readable();
    stream.push(/* GraphQL */ `
      type Todo @model {
        content: String!
      }
    `);
    stream.push(null); // end of stream

    // wrap the Stream with SDK mixin
    const sdkStream = sdkStreamMixin(stream);
    s3Mock
      .on(GetObjectCommand, {
        Bucket: 'im_a_real_bucket',
        Key: 'i_swear',
      })
      .resolves({
        Body: sdkStream,
      });

    const modelIntrospectionSchema = await new ModelIntrospectionSchemaAdapter(
      stubClientProvider
    ).getModelIntrospectionSchemaFromS3Uri('s3://im_a_real_bucket/i_swear');
    assert.deepEqual(modelIntrospectionSchema, {
      version: 1,
      models: {
        Todo: {
          name: 'Todo',
          fields: {
            id: {
              name: 'id',
              isArray: false,
              type: 'ID',
              isRequired: true,
              attributes: [],
            },
            content: {
              name: 'content',
              isArray: false,
              type: 'String',
              isRequired: true,
              attributes: [],
            },
            createdAt: {
              name: 'createdAt',
              isArray: false,
              type: 'AWSDateTime',
              isRequired: false,
              attributes: [],
              isReadOnly: true,
            },
            updatedAt: {
              name: 'updatedAt',
              isArray: false,
              type: 'AWSDateTime',
              isRequired: false,
              attributes: [],
              isReadOnly: true,
            },
          },
          syncable: true,
          // eslint-disable-next-line spellcheck/spell-checker
          pluralName: 'Todos',
          attributes: [
            {
              type: 'model',
              properties: {},
            },
          ],
          primaryKeyInfo: {
            isCustomPrimaryKey: false,
            primaryKeyFieldName: 'id',
            sortKeyFieldNames: [],
          },
        },
      },
      enums: {},
      nonModels: {},
    });
  });
});
