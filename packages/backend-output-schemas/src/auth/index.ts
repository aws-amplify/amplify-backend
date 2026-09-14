import { z } from 'zod';
import { authOutputSchema as authOutputSchemaV1 } from './v1.js';

export const versionedAuthOutputSchema = z.discriminatedUnion('version', [
  authOutputSchemaV1,
  // this is where additional auth major version schemas would go
]);

export type AuthOutput = z.infer<typeof versionedAuthOutputSchema>;
