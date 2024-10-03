import { z } from 'zod';
import { aiConversationOutputSchema as aiConversationOutputSchemaV1 } from './v1';

export const versionedAiConversationOutputSchema = z.discriminatedUnion(
  'version',
  [
    aiConversationOutputSchemaV1,
    // this is where additional function major version schemas would go
  ]
);

export type AiConversationOutput = z.infer<
  typeof versionedAiConversationOutputSchema
>;
