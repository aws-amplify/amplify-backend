import { z } from 'zod';
import { BackendOutputEntry } from '@aws-amplify/plugin-types';

export const authOutputSchema = z.object({
  userPoolId: z.string(),
});

export type AuthOutputType = z.infer<typeof authOutputSchema>;

/**
 * Backend outputs from Auth
 */
export class AuthOutput implements BackendOutputEntry<AuthOutputType> {
  readonly schemaIdentifier = {
    schemaName: 'AuthOutput',
    schemaVersion: 1,
  };

  /**
   * Internal constructor
   */
  private constructor(readonly payload: AuthOutputType) {}

  /**
   * Construct an AuthOutput instance with runtime validation of the authOutput shape
   */
  static fromAuthOutput(authOutput: AuthOutputType) {
    return new AuthOutput(authOutputSchema.parse(authOutput));
  }
}
