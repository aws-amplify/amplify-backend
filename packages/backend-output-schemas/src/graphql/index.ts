import { z } from 'zod';
import { graphqlOutputSchema as graphqlOutputSchemaV1 } from './v1.js';

export const versionedGraphqlOutputSchema = z.discriminatedUnion('version', [
  graphqlOutputSchemaV1,
  // this is where additional graphql major version schemas would go
]);

export type GraphqlOutput = z.infer<typeof versionedGraphqlOutputSchema>;
