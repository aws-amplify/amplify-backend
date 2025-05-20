import { z } from 'zod';
import { functionOutputSchema as functionOutputSchemaV1 } from './v1';

export const versionedFunctionOutputSchema = z.discriminatedUnion('version', [
  functionOutputSchemaV1,
  // this is where additional function major version schemas would go
]);

export type FunctionOutput = z.infer<typeof versionedFunctionOutputSchema>;
