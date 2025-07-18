import {
  AmplifyResourceGroupName,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { Aws } from 'aws-cdk-lib/core';
import { AmplifyGeoFactoryProps, GeoResources } from './types.js';
import { GeoAccessOrchestratorFactory } from './geo_access_orchestrator.js';
import { AmplifyGeo } from './construct.js';
import { Tags } from 'aws-cdk-lib';
import { TagName } from '@aws-amplify/platform-core';

// define factory class
/**
 * Amplify Geo Construct Factory
 *
 * Designed to manage the initialization of AmplifyGeo construct among other constructs and construct-agnostic resource access orchestration.
 */
export class AmplifyGeoFactory
  implements ConstructFactory<ResourceProvider<GeoResources>>
{
  private geoGenerator: ConstructContainerEntryGenerator;
  private geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory =
    new GeoAccessOrchestratorFactory();

  // define constructor for class
  /**
   * Constructs a new AmplifyGeoFactory instance
   * @param props - properties for the geo factory
   */
  constructor(private readonly props: AmplifyGeoFactoryProps) {}

  // define GetInstance function
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyGeo => {
    // get construct factory instance properties
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    // validates the user-entered resource name (according to CDK naming regulations)
    resourceNameValidator?.validate(this.props.name);

    // AWS-MANAGED RESOURCE ACCESS ORCHESTRATION HERE
    if (this.props.resourceIdentifier !== 'collection') {
      // only limited to collections currently
      const geoAccessOrchestrator =
        this.geoAccessOrchestratorFactory.getInstance(
          this.props.access,
          getInstanceProps,
        );

      // access orchestration for non-collection resources done here
      geoAccessOrchestrator.orchestrateGeoAccess(
        `arn:${Aws.PARTITION}:geo-${this.props.resourceIdentifier}:${this.props.region}::provider/default`,
      );
    }

    // generates a singleton container entry for this construct factory
    if (!this.geoGenerator) {
      this.geoGenerator = new AmplifyGeoGenerator(this.props, getInstanceProps);
    }

    // this getOrCompute accesses the internal construct container cache
    return constructContainer.getOrCompute(this.geoGenerator) as AmplifyGeo;
  };
}

// define generator class
/**
 * Amplify Geo Construct Generator
 *
 * Designed to manage the generation of the Amplify Geo construct instance along with resource access orchestration.
 */
export class AmplifyGeoGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'geo';

  /**
   * Constructs an AmplifyGeoGenerator instance
   * @param props - properties for the Amplify Geo Factory
   * @param getInstanceProps - instance properties of a specific construct factory
   * @param geoAccessOrchestratorFactory - instance of the access orchestrator factory (lazy initialization)
   */
  constructor(
    private readonly props: AmplifyGeoFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory = new GeoAccessOrchestratorFactory(),
  ) {}

  /* This function will perform the following actions:
        1. create an instance of the L3 construct created for Geo (AmplifyGeo)
        2. call the defineGeoAccess() function with access permissions for all three resources
    */
  generateContainerEntry = ({
    // construct-related activities
    scope,
  }: GenerateContainerEntryProps) => {
    const amplifyGeo = new AmplifyGeo(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    // creating a CDK lookup tag
    Tags.of(amplifyGeo).add(TagName.FRIENDLY_NAME, this.props.name);

    // CLOUDFORMATION CONSTRUCT RESOURCES WILL HAVE ACCESS ORCHESTRATION HERE
    if (this.props.resourceIdentifier === 'collection') {
      // only limited to collections currently
      const geoAccessOrchestrator =
        this.geoAccessOrchestratorFactory.getInstance(
          this.props.access,
          this.getInstanceProps,
        );

      // initializing orchestration process
      geoAccessOrchestrator.orchestrateGeoAccess(
        amplifyGeo.resources.collection.geofenceCollectionArn,
      );
    }

    return amplifyGeo;
  };
}

// export defineX() functions

/**
 * Include a map within your Amplify backend.
 */
export const defineMap = (
  // doesn't return anything because it only configures access
  props: AmplifyGeoFactoryProps,
): ConstructFactory<ResourceProvider<GeoResources> & StackProvider> =>
  new AmplifyGeoFactory({
    ...props,
    resourceIdentifier: 'map',
  });

/**
 * Include a place index within your Amplify backend.
 */
export const definePlace = (
  // doesn't return anything because it only configures access
  props: AmplifyGeoFactoryProps,
): ConstructFactory<ResourceProvider<GeoResources> & StackProvider> =>
  new AmplifyGeoFactory({
    ...props,
    resourceIdentifier: 'place',
  });

/**
 * Include a geofence collection within your Amplify backend.
 */
export const defineCollection = (
  // returns resources and any stack errors
  props: AmplifyGeoFactoryProps,
): ConstructFactory<ResourceProvider<GeoResources> & StackProvider> =>
  new AmplifyGeoFactory({
    ...props,
    resourceIdentifier: 'collection',
  }); // should this be called AmplifyCollectionFactory?
