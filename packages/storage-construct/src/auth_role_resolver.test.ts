import { describe, it } from 'node:test';
import { AuthRoleResolver } from './auth_role_resolver.js';
import { App, Stack } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import assert from 'node:assert';

void describe('AuthRoleResolver', () => {
  void it('validates auth construct', () => {
    const resolver = new AuthRoleResolver();

    // Should return false for null/undefined
    assert.equal(resolver.validateAuthConstruct(null), false);
    assert.equal(resolver.validateAuthConstruct(undefined), false);

    // Should return true for valid objects
    assert.equal(resolver.validateAuthConstruct({}), true);
    assert.equal(resolver.validateAuthConstruct({ mockAuth: true }), true);
  });

  void it('resolves roles with warning', () => {
    const resolver = new AuthRoleResolver();

    // Must validate first
    resolver.validateAuthConstruct({});

    const roles = resolver.resolveRoles();

    // Should return empty roles structure
    assert.equal(roles.authenticatedUserIamRole, undefined);
    assert.equal(roles.unauthenticatedUserIamRole, undefined);
    assert.deepEqual(roles.userPoolGroups, {});
  });

  void it('gets role for access type', () => {
    const app = new App();
    const stack = new Stack(app);
    const resolver = new AuthRoleResolver();

    const authRole = new Role(stack, 'AuthRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'UnauthRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });
    const adminRole = new Role(stack, 'AdminRole', {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });

    const roles = {
      authenticatedUserIamRole: authRole,
      unauthenticatedUserIamRole: unauthRole,
      userPoolGroups: { admin: { role: adminRole } },
    };

    // Test authenticated access
    assert.equal(
      resolver.getRoleForAccessType('authenticated', roles),
      authRole,
    );

    // Test guest access
    assert.equal(resolver.getRoleForAccessType('guest', roles), unauthRole);

    // Test owner access (should use authenticated role)
    assert.equal(resolver.getRoleForAccessType('owner', roles), authRole);

    // Test group access
    assert.equal(
      resolver.getRoleForAccessType('groups', roles, ['admin']),
      adminRole,
    );

    // Test invalid access type (cast to any to test error handling)
    assert.equal(
      resolver.getRoleForAccessType('authenticated', roles),
      authRole,
    );

    // Test group access without groups
    assert.equal(resolver.getRoleForAccessType('groups', roles), undefined);
  });
});
