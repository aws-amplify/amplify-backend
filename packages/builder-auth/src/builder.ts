import { Construct } from 'constructs';
import { ConstructBuilder } from '@aws-amplify/platform-types';
import { AmplifyAuth, AuthProps } from '@aws-amplify/construct-auth';

/**
 * Builder around AmplifyAuth that can be used in `auth.ts` files
 */
export class Auth implements ConstructBuilder<AmplifyAuth> {
  private instance: AmplifyAuth | undefined;
  /**
   * Set the properties that will be used to initialize the Auth construct
   */
  constructor(private readonly props: AuthProps) {}

  /**
   * Build a singleton instance of the Auth construct
   */
  build(scope: Construct, name: string): AmplifyAuth {
    if (this.instance === undefined) {
      this.instance = new AmplifyAuth(scope, name, this.props);
    }
    return this.instance;
  }
}
