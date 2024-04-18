import { Client, MetadataBearer } from '@aws-sdk/types';
export type AWSClientProvider<
  T extends Record<
    `get${string}Client`,
    Client<object, MetadataBearer, unknown>
  >
> = {
  [K in keyof T]: () => T[K];
};
