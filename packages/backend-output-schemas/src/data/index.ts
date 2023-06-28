import { z } from 'zod';
import { dataOutputSchema as dataOutputSchemaV1 } from './v1.js';

export const versionedDataOutputSchema = z.discriminatedUnion('version', [
  dataOutputSchemaV1,
  // this is where additional data major version schemas would go
]);

export type DataOutput = z.infer<typeof versionedDataOutputSchema>;
