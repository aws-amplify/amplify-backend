import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import {
  GeoAccessBuilder,
  GeoAccessGenerator,
  GeoResourceType,
} from './types.js';
import { roleAccessBuilder as _roleAccessBuilder } from './access_builder.js';
import { GeoAccessPolicyFactory } from './geo_access_policy_factory.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

// this file is responsible for implementing the following:
// 1. access orchestrator for geo
/**
 * Access Orchestrator for Amplify Geo
 *
 * Configures access permissions to associate them with roles.
 */
export class GeoAccessOrchestrator {
  /**
   * Constructs an instance of GeoAccessOrchestrator
   * @param geoAccessGenerator - access permissions defined by user for the resource
   * @param getInstanceProps - instance properties of a specific construct factory
   * @param geoPolicyFactory - instance of GeoAccessPolicyFactory to generate policyStatements
   * @param roleAccessBuilder - permission reader and processor
   */
  constructor(
    private readonly geoAccessGenerator: GeoAccessGenerator,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoPolicyFactory: GeoAccessPolicyFactory = new GeoAccessPolicyFactory(),
    private readonly roleAccessBuilder: GeoAccessBuilder = _roleAccessBuilder,
  ) {}

  /**
   * Orchestrates the process of translating the customer-provided storage access rules into IAM policies and attaching those policies to the appropriate roles.
   *
   * The high level steps are:
   * 1. Invokes the geoAccessGenerator to produce a storageAccessDefinition
   * 3. Organizes the storageAccessDefinition into internally managed maps to facilitate translation into allow / deny rules on IAM policies
   * 4. Invokes the policy generator to produce a policy with appropriate allow / deny rules
   * 5. Invokes the resourceAccessAcceptors for each entry in the geoAccessDefinition to accept the corresponding IAM policy
   */
  orchestrateGeoAccess = (resourceArn: string) => {
    // getting access definitions from allow calls
    const geoAccessDefinitions = this.geoAccessGenerator(
      this.roleAccessBuilder,
    );

    geoAccessDefinitions.forEach((definition) => {
      // get all user roles for each definition
      const uniqueRoleTokenSet = new Set<string>();

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

      definition.userRoles.forEach((user) => {
        this.geoPolicyFactory.attachPolicy(
          // attaching policy statement to principal policy of each user Role provided within access definition
          user(this.getInstanceProps),
          this.geoPolicyFactory.createPolicyStatement(
            definition.actions,
            resourceArn,
          ), // creating a policy statement for all actions provided within definition
        );
      });
    });
  };
}

// needed for test mocking
/**
 * Instance Manager for Geo Access Orchestration
 */
export class GeoAccessOrchestratorFactory {
  private readonly resourceType: GeoResourceType;

  getInstance = (
    geoAccessGenerator: GeoAccessGenerator,
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ) => new GeoAccessOrchestrator(geoAccessGenerator, getInstanceProps);
}
