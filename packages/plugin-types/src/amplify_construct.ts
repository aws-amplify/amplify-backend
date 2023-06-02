import { Construct } from 'constructs';
import { FrontendConfigValuesProvider } from './stack_output_provider.js';

/**
 * Intersection type of Construct and other interfaces that Amplify constructs may implement
 */
export type AmplifyConstruct = Construct &
  Partial<FrontendConfigValuesProvider>;
