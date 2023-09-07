import { GraphqlFormGenerationResult } from './graphql_form_generation_result.js';

export interface GraphqlFormGenerator {
  generateForms: () => Promise<GraphqlFormGenerationResult>;
}
