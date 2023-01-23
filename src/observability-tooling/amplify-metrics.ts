import { IAmplifyMetrics } from '../types';

/**
 * TBD what this class looks like. It's just a placeholder of the kind of stuff we can inject into the transformers
 */
export class AmplifyMetrics implements IAmplifyMetrics {
  tbd(info: string): void {
    // log metrics
  }
}

export const amplifyMetrics = new AmplifyMetrics();
