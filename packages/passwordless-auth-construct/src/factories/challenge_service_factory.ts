import { ChallengeService, SignInMethod } from '../types.js';

/**
 * A factory for creating ChallengeServices.
 * Determines which ChallengeService to use based on the signInMethod.
 */
export class ChallengeServiceFactory {
  /**
   * Creates a new ChallengeServiceFactory instance.
   * @param services - The list of supported challenge services.
   */
  constructor(private services?: ChallengeService[]) {}

  public getService = (signInMethod: SignInMethod) => {
    for (const service of this.services ?? []) {
      if (service.signInMethod === signInMethod) {
        return service;
      }
    }
    throw new Error(`No ChallengeService found for: ${signInMethod}`);
  };
}
