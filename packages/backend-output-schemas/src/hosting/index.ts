import { z } from 'zod';
import { hostingOutputSchema as hostingOutputSchemaV1 } from './v1.js';

export const versionedHostingOutputSchema = z.discriminatedUnion('version', [
  hostingOutputSchemaV1,
  // this is where additional hosting major version schemas would go
]);

export type HostingOutput = z.infer<typeof versionedHostingOutputSchema>;
