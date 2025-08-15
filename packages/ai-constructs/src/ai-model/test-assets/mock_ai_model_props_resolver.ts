import { AiModelPropsResolver } from '../runtime/ai_model_props_resolver';
import { mockModelsData } from './mock_models_data';

/**
 * Mock implementation of AiModelPropsResolver for testing purposes.
 * Uses mockModelsData to simulate AI model properties resolution.
 */
export class MockAiModelPropsResolver extends AiModelPropsResolver {
  /** Creates a new instance of MockAiModelPropsResolver. */
  constructor() {
    super();
    // eslint-disable-next-line
    (this as any).data = mockModelsData;
  }
}
