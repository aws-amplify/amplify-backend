import {
  AmplifyResourceGroupName,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { Aspects, Stack, Tags } from 'aws-cdk-lib/core';
import { AmplifyCollectionFactoryProps, CollectionResources } from './types.js';
import { GeoAccessOrchestratorFactory } from './geo_access_orchestrator.js';
import { AmplifyCollection } from './collection_construct.js';
import { TagName } from '@aws-amplify/platform-core';
import { AmplifyGeoOutputsAspect } from './geo_outputs_aspect.js';

/**
 *  Construct factory for AmplifyCollection
 */
export class AmplifyCollectionFactory
  implements ConstructFactory<ResourceProvider<CollectionResources>>
{
  private collectionGenerator: AmplifyCollectionGenerator;
  private geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory =
    new GeoAccessOrchestratorFactory();

  /**
   * Creates an instance of AmplifyCollectionFactory
   * @param props - collection construct properties
   */
  constructor(private readonly props: AmplifyCollectionFactoryProps) {}

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyCollection => {
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    resourceNameValidator?.validate(this.props.name);

    if (!this.collectionGenerator) {
      this.collectionGenerator = new AmplifyCollectionGenerator(
        this.props,
        getInstanceProps,
      );
    }

    return constructContainer.getOrCompute(
      this.collectionGenerator,
    ) as AmplifyCollection;
  };
}

/**
 * Construct Container Entry Generator for AmplifyCollection
 */
export class AmplifyCollectionGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName: AmplifyResourceGroupName = 'geo';

  /**
   * Creates an instance of the AmplifyCollectionGenerator
   */
  constructor(
    private readonly props: AmplifyCollectionFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory = new GeoAccessOrchestratorFactory(),
  ) {}

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<CollectionResources> => {
    const amplifyCollection = new AmplifyCollection(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    Tags.of(amplifyCollection).add(TagName.FRIENDLY_NAME, this.props.name);

    if (!this.props.access) {
      return amplifyCollection;
    }

    const geoAccessOrchestrator = this.geoAccessOrchestratorFactory.getInstance(
      this.props.access,
      this.getInstanceProps,
      Stack.of(scope),
      [],
    );

    amplifyCollection.resources.policies =
      geoAccessOrchestrator.orchestrateGeoAccess(
        amplifyCollection.resources.collection.geofenceCollectionArn,
        'collection',
      );

    const geoAspects = Aspects.of(Stack.of(amplifyCollection));
    if (!geoAspects.all.length) {
      new AmplifyGeoOutputsAspect(this.getInstanceProps.outputStorageStrategy);
    }

    return amplifyCollection;
  };
}

/**
 * Provision a geofence collection within your Amplify backend.
 * @see https://docs.amplify.aws/react/build-a-backend/add-aws-services/geo/configure-geofencing/
 */
export const defineCollection = (
  props: AmplifyCollectionFactoryProps,
): ConstructFactory<ResourceProvider<CollectionResources> & StackProvider> =>
  new AmplifyCollectionFactory(props);
