import {
  AuthResourceReferences,
  AuthResourceReferencesContainer,
} from '@aws-amplify/plugin-types';

/**
 *
 */
export class SetOnceAuthResourceReferencesContainer
  implements AuthResourceReferencesContainer
{
  private authResourceReferences: AuthResourceReferences = {};
  private isSet = false;

  /**
   * Returns the auth references that this container has
   */
  getAuthResourceReferences(): AuthResourceReferences {
    return this.authResourceReferences;
  }

  /**
   * Sets auth references in this container. If references have already been set, this method throws
   */
  setAuthResourceReferences(
    authResourceReferences: AuthResourceReferences
  ): void {
    if (this.isSet) {
      throw new Error(
        `AuthResourceReferences have already been set and cannot be overwritten`
      );
    }
    this.authResourceReferences = authResourceReferences;
    this.isSet = true;
  }
}
