import { defineFunction } from '@aws-amplify/backend';

export const customerS3Import = defineFunction({
  name: 'customer-s3-import',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
