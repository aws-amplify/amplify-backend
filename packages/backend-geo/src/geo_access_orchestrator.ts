import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import {
  GeoAccessBuilder,
  GeoAccessGenerator,
  GeoResourceType,
  resourceActionRecord,
} from './types.js';
import { roleAccessBuilder as _roleAccessBuilder } from './access_builder.js';
import { GeoAccessPolicyFactory } from './geo_access_policy_factory.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';

/**
 * Access Orchestrator for Amplify Geo
 *
 * Configures access permissions to associate them with roles.
 */
export class GeoAccessOrchestrator {
  private resourceStack: Stack;
  private policies: Policy[] = [];
  private apiKeyActions: string[] = [];

  /**
   * Constructs an instance of GeoAccessOrchestrator
   * @param geoAccessGenerator - access permissions defined by user for the resource
   * @param getInstanceProps - instance properties of a specific construct factory
   * @param geoStack - instance of GeoAccessPolicyFactory to generate policyStatements
   * @param ssmEnvironmentEntries - permission reader and processor
   * @param geoPolicyFactory - instance of the GeoAccessPolicyFactory for policy generation
   * @param roleAccessBuilder - instance of the GeoAccessBuilder for access definition transformation
   */
  constructor(
    private readonly geoAccessGenerator: GeoAccessGenerator,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoStack: Stack,
    private readonly ssmEnvironmentEntries: SsmEnvironmentEntry[],
    private readonly geoPolicyFactory: GeoAccessPolicyFactory = new GeoAccessPolicyFactory(),
    private readonly roleAccessBuilder: GeoAccessBuilder = _roleAccessBuilder,
  ) {
    this.resourceStack = geoStack;
  }

  /**
   * Orchestrates the process of translating the customer-provided storage access rules into IAM policies and attaching those policies to the appropriate roles.
   * @param resourceArn - Amazon Resource Name (ARN) for the resource with access permissions
   * @param resourceIdentifier - type of resource being defined
   */
  orchestrateGeoAccess = (
    resourceArn: string,
    resourceIdentifier: GeoResourceType,
    resourceName: string,
  ): Policy[] => {
    // getting access definitions from allow calls
    const geoAccessDefinitions = this.geoAccessGenerator(
      this.roleAccessBuilder,
    );

    const uniqueRoleTokenSet = new Set<string>();

    geoAccessDefinitions.forEach((definition) => {
      const uniqueActionSet = new Set<string>();

      definition.uniqueDefinitionValidators.forEach(
        ({ uniqueRoleToken, validationErrorOptions }) => {
          if (uniqueRoleTokenSet.has(uniqueRoleToken)) {
            throw new AmplifyUserError(
              'InvalidGeoAccessDefinitionError',
              validationErrorOptions,
            );
          } else {
            uniqueRoleTokenSet.add(uniqueRoleToken);
          }
        },
      );

      // checking for valid actions for resource type
      definition.actions.forEach((action) => {
        if (!resourceActionRecord[resourceIdentifier].includes(action)) {
          throw new AmplifyUserError('ActionNotFoundError', {
            message: `Desired access action not found for the specific ${resourceIdentifier} resource.`,
            resolution: `Please refer to specific ${resourceIdentifier} access actions for more information.`,
          });
        }
        if (uniqueActionSet.has(action)) {
          throw new AmplifyUserError('DuplicateActionFoundError', {
            message: `Desired access action is duplicated for the specific ${resourceIdentifier} resource.`,
            resolution: `Remove all but one mentions of the ${action} action for the specific ${resourceIdentifier} resource.`,
          });
        }
        uniqueActionSet.add(action);
      });

      // api key has no acceptors
      if (!definition.getAccessAcceptors.length) {
        this.apiKeyActions = definition.actions;
      }

      definition.getAccessAcceptors.forEach((acceptor) => {
        // for each acceptor within auth, guest, or user groups
        const policy: Policy = this.geoPolicyFactory.createPolicy(
          definition.actions,
          resourceArn,
          acceptor(this.getInstanceProps).identifier,
          resourceName,
          this.resourceStack,
        );
        acceptor(this.getInstanceProps).acceptResourceAccess(
          policy,
          this.ssmEnvironmentEntries,
        );
        this.policies.push(policy);
      });
    });

    return this.policies;
  };

  orchestrateKeyAccess = () =>
    this.geoPolicyFactory.generateKeyActions(this.apiKeyActions);
}

/**
 * Instance Manager for Geo Access Orchestration
 */
export class GeoAccessOrchestratorFactory {
  getInstance = (
    geoAccessGenerator: GeoAccessGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
    stack: Stack,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
  ) =>
    new GeoAccessOrchestrator(
      geoAccessGenerator,
      getInstanceProps,
      stack,
      ssmEnvironmentEntries,
    );
}
