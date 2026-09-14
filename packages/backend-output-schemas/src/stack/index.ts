import { z } from 'zod';
import { stackOutputSchema as stackOutputSchemaV1 } from './v1.js';

export const versionedStackOutputSchema = z.discriminatedUnion('version', [
  stackOutputSchemaV1,
  // this is where additional stack major version schemas would go
]);

export type StackOutput = z.infer<typeof versionedStackOutputSchema>;
