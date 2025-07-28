import { IRole } from 'aws-cdk-lib/aws-iam';

/**
 * Represents the collection of IAM roles provided by an auth construct.
 * These roles are used to grant different types of access to storage resources.
 */
export type AuthRoles = {
  /** Role for authenticated (signed-in) users */
  authenticatedUserIamRole?: IRole;
  /** Role for unauthenticated (guest) users */
  unauthenticatedUserIamRole?: IRole;
  /** Map of user group names to their corresponding IAM roles */
  userPoolGroups?: Record<string, { role: IRole }>;
};

/**
 * The AuthRoleResolver extracts IAM roles from auth constructs and maps them
 * to storage access types. It handles different auth providers and role structures.
 *
 * This class abstracts the complexity of different auth construct implementations
 * and provides a consistent interface for role resolution.
 * @example
 * ```typescript
 * const resolver = new AuthRoleResolver();
 * if (resolver.validateAuthConstruct(auth)) {
 *   const roles = resolver.resolveRoles();
 *   const authRole = resolver.getRoleForAccessType('authenticated', roles);
 * }
 * ```
 */
export class AuthRoleResolver {
  private authConstruct: unknown;

  /**
   * Validates that an auth construct provides the necessary role structure.
   * @param auth - The auth construct to validate
   * @returns true if valid, false otherwise
   */
  validateAuthConstruct = (auth: unknown): boolean => {
    if (!auth || typeof auth !== 'object') {
      return false;
    }

    // Store for later use
    this.authConstruct = auth;

    // For now, accept any object as valid (simplified validation)
    return true;
  };

  /**
   * Extracts IAM roles from the validated auth construct.
   * @returns Object containing available IAM roles
   * @throws {Error} If called before validateAuthConstruct or with invalid construct
   */
  resolveRoles = (): AuthRoles => {
    if (!this.authConstruct) {
      throw new Error('Must call validateAuthConstruct first');
    }

    const authObj = this.authConstruct as Record<string, unknown>;
    const resources = (authObj.resources as Record<string, unknown>) || {};

    return {
      authenticatedUserIamRole: resources.authenticatedUserIamRole as
        | IRole
        | undefined,
      unauthenticatedUserIamRole: resources.unauthenticatedUserIamRole as
        | IRole
        | undefined,
      userPoolGroups:
        (resources.userPoolGroups as Record<string, { role: IRole }>) || {},
    };
  };

  /**
   * Gets the appropriate IAM role for a specific access type.
   * @param accessType - The type of access (authenticated, guest, owner, groups)
   * @param authRoles - The available auth roles
   * @param groups - Required for 'groups' access type
   * @returns The IAM role or undefined if not found
   */
  getRoleForAccessType = (
    accessType: 'authenticated' | 'guest' | 'owner' | 'groups' | 'resource',
    authRoles: AuthRoles,
    groups?: string[],
    resource?: unknown,
  ): IRole | undefined => {
    switch (accessType) {
      case 'authenticated':
      case 'owner': // Owner access uses authenticated role with entity substitution
        return authRoles.authenticatedUserIamRole;

      case 'guest':
        return authRoles.unauthenticatedUserIamRole;

      case 'groups':
        if (!groups || groups.length === 0) {
          return undefined;
        }
        // Return the first available group role
        for (const groupName of groups) {
          const groupRole = authRoles.userPoolGroups?.[groupName]?.role;
          if (groupRole) {
            return groupRole;
          }
        }
        return undefined;

      case 'resource':
        return this.extractRoleFromResource(resource);

      default:
        return undefined;
    }
  };

  /**
   * Extracts IAM role from a resource construct.
   * Supports Lambda functions and other constructs with IAM roles.
   */
  private extractRoleFromResource = (resource: unknown): IRole | undefined => {
    if (!resource || typeof resource !== 'object') {
      return undefined;
    }

    const resourceObj = resource as Record<string, unknown>;

    // Try to extract role from Lambda function
    if (resourceObj.role && typeof resourceObj.role === 'object') {
      return resourceObj.role as IRole;
    }

    // Try to extract from resources property (common pattern)
    if (resourceObj.resources && typeof resourceObj.resources === 'object') {
      const resources = resourceObj.resources as Record<string, unknown>;
      if (resources.lambda && typeof resources.lambda === 'object') {
        const lambda = resources.lambda as Record<string, unknown>;
        if (lambda.role) {
          return lambda.role as IRole;
        }
      }
    }

    return undefined;
  };
}
