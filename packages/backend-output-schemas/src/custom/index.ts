import { z } from 'zod';
import { customOutputSchema as customOutputSchemaV1 } from './v1.js';

export const versionedCustomOutputSchema = z.discriminatedUnion('version', [
  customOutputSchemaV1,
  // this is where additional custom major version schemas would go
]);

export type CustomOutput = z.infer<typeof versionedCustomOutputSchema>;
