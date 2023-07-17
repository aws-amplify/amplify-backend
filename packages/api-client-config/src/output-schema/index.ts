import { z } from 'zod';
import { apiOutputSchema as apiOutputSchemaV1 } from './v1.js';

export const versionedApiOutputSchema = z.discriminatedUnion('version', [
  apiOutputSchemaV1,
  // this is where additional api major version schemas would go
]);

export type ApiOutput = z.infer<typeof versionedApiOutputSchema>;
