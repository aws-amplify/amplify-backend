import assert from 'assert';
import { beforeEach, describe, it } from 'node:test';
import { getModelIntrospectionSchemaFromS3Uri } from './generate_model_introspection_from_schema_uri.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
// eslint-disable-next-line import/no-extraneous-dependencies
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

void describe('getModelIntrospectionSchemaFromS3Uri', () => {
  const s3Mock = mockClient(S3Client);

  void beforeEach(() => {
    s3Mock.reset();
  });

  void it('returns undefined on undefined schema uri', async () => {
    const modelIntrospectionSchema = await getModelIntrospectionSchemaFromS3Uri(
      {
        modelSchemaS3Uri: undefined,
        credentialProvider: fromNodeProviderChain(),
      }
    );
    assert.deepEqual(modelIntrospectionSchema, undefined);
  });

  void it('throws on invalid s3 location', async () => {
    await assert.rejects(() =>
      getModelIntrospectionSchemaFromS3Uri({
        modelSchemaS3Uri: 's3://im_a_fake_bucket/i_swear',
        credentialProvider: fromNodeProviderChain(),
      })
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

    const modelIntrospectionSchema = await getModelIntrospectionSchemaFromS3Uri(
      {
        modelSchemaS3Uri: 's3://im_a_real_bucket/i_swear',
        credentialProvider: fromNodeProviderChain(),
      }
    );
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
