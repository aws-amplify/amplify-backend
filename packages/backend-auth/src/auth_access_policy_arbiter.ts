import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntriesGenerator,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { AccessDefinition, Role } from './types.js';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';

/**
 * Middleman between creating bucket policies and attaching those policies to corresponding roles
 */
export class AuthAccessPolicyArbiter {
  /**
   * Instantiate with context from the storage factory
   */
  constructor(
    private readonly name: string,
    private readonly accessDefinition: Partial<Record<Role, AccessDefinition>>,
    private readonly ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly userpool: IUserPool,
    private readonly userpoolAccessPolicyFactory = new UserPoolAccessPolicyFactory(
      userpool
    )
  ) {}

  /**
   * Responsible for creating policies corresponding to the definition,
   * then invoking the corresponding ResourceAccessAcceptor to accept the policies
   */
  arbitratePolicies = () => {
    const ssmEnvironmentEntries =
      this.ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries({
        [`${this.name}_USERPOOL_ARN`]: this.userpool.userPoolArn,
      });

    this.acceptResourceAccess('users', ssmEnvironmentEntries);
    this.acceptResourceAccess('groups', ssmEnvironmentEntries);
  };

  acceptResourceAccess = (
    role: Role,
    ssmEnvironmentEntries: SsmEnvironmentEntry[]
  ) => {
    const accessDefinition = this.accessDefinition[role];

    // no-op if access definition is not found for role.
    if (!accessDefinition) {
      return;
    }

    const accessAcceptor = accessDefinition.getResourceAccessAcceptor(
      this.getInstanceProps
    );
    if (!accessAcceptor) {
      return;
    }
    const policy = this.userpoolAccessPolicyFactory.createPolicy(
      new Set(accessDefinition.actions)
    );
    accessAcceptor.acceptResourceAccess(policy, ssmEnvironmentEntries);
  };
}

/**
 *
 */
export class AuthAccessPolicyArbiterFactory {
  getInstance = (
    name: string,
    accessDefinition: Partial<Record<Role, AccessDefinition>>,
    ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    userpool: IUserPool,
    userpoolAccessPolicyFactory = new UserPoolAccessPolicyFactory(userpool)
  ) =>
    new AuthAccessPolicyArbiter(
      name,
      accessDefinition,
      ssmEnvironmentEntriesGenerator,
      getInstanceProps,
      userpool,
      userpoolAccessPolicyFactory
    );
}
