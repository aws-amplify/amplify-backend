import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { AuthAccessDefinition } from './types.js';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class AuthAccessPolicyArbiter {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly accessDefinition: AuthAccessDefinition[],
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly ssmEnvironmentEntries: SsmEnvironmentEntry[],
    private readonly userpoolAccessPolicyFactory: UserPoolAccessPolicyFactory
  ) {}

  /**
   * Responsible for creating policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  arbitratePolicies = () => {
    this.accessDefinition.forEach(this.acceptResourceAccess);
  };

  acceptResourceAccess = (accessDefinition: AuthAccessDefinition) => {
    const accessAcceptor = accessDefinition.getResourceAccessAcceptor(
      this.getInstanceProps
    );
    const policy = this.userpoolAccessPolicyFactory.createPolicy(
      accessDefinition.actions
    );

    accessAcceptor.acceptResourceAccess(policy, this.ssmEnvironmentEntries);
  };
}

/**
 *
 */
export class AuthAccessPolicyArbiterFactory {
  getInstance = (
    accessDefinition: AuthAccessDefinition[],
    getInstanceProps: ConstructFactoryGetInstanceProps,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
    userpoolAccessPolicyFactory: UserPoolAccessPolicyFactory
  ) =>
    new AuthAccessPolicyArbiter(
      accessDefinition,
      getInstanceProps,
      ssmEnvironmentEntries,
      userpoolAccessPolicyFactory
    );
}
