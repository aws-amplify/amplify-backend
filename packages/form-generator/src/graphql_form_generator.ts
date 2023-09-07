import { GraphqlFormGenerationResult } from './graphql_form_generation_result.js';

export type GraphqlFormGenerator = {
  generateForms: () => Promise<GraphqlFormGenerationResult>;
};
