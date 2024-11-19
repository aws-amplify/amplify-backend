import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
// @ts-ignore
import { env } from '$amplify/env/customer-s3-import.js';
import { S3Client } from '@aws-sdk/client-s3';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: Handler = async () => {
  const _s3Client = new S3Client();
  const _todos = await client.models.Todo.list();
  return 'STATIC TEST RESPONSE';
};
