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
import { AmplifyPlaceFactoryProps, PlaceResources } from './types.js';
import { GeoAccessOrchestratorFactory } from './geo_access_orchestrator.js';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { AmplifyPlace } from './place_resource.js';
import { AmplifyGeoOutputsAspect } from './geo_outputs_aspect.js';

/**
 * Construct Factory for AmplifyPlace
 */
export class AmplifyPlaceFactory
  implements ConstructFactory<ResourceProvider<PlaceResources>>
{
  static mapCount: number = 0;

  private geoGenerator: ConstructContainerEntryGenerator;
  private geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory =
    new GeoAccessOrchestratorFactory();

  /**
   * Constructs a new AmplifyPlaceFactory instance
   * @param props - place resource properties
   */
  constructor(private readonly props: AmplifyPlaceFactoryProps) {
    if (AmplifyPlaceFactory.mapCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `definePlace` calls not permitted within an Amplify backend',
        resolution: 'Maintain one `definePlace` call',
      });
    }
    AmplifyPlaceFactory.mapCount++;
  }

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyPlace => {
    // get construct factory instance properties
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    // validates the user-entered resource name (according to CDK naming regulations)
    resourceNameValidator?.validate(this.props.name);

    // generates a singleton container entry for this construct factory
    if (!this.geoGenerator) {
      this.geoGenerator = new AmplifyPlaceGenerator(
        this.props,
        getInstanceProps,
      );
    }

    // this getOrCompute accesses the internal construct container cache
    return constructContainer.getOrCompute(this.geoGenerator) as AmplifyPlace;
  };
}

/**
 * Construct Container Entry Generator for AmplifyPlace
 */
export class AmplifyPlaceGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'geo';

  /**
   * Creates an instance of AmplifyPlaceGenerator
   */
  constructor(
    private readonly props: AmplifyPlaceFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory = new GeoAccessOrchestratorFactory(),
  ) {}

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<PlaceResources> => {
    const geoAccessOrchestrator = this.geoAccessOrchestratorFactory.getInstance(
      this.props.access,
      this.getInstanceProps,
      Stack.of(scope),
      [],
    );

    const amplifyPlace = new AmplifyPlace(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    Tags.of(amplifyPlace).add(TagName.FRIENDLY_NAME, this.props.name);

    amplifyPlace.resources.policies =
      geoAccessOrchestrator.orchestrateGeoAccess(
        amplifyPlace.getResourceArn(),
        'map',
      );

    const geoAspects = Aspects.of(Stack.of(amplifyPlace));
    if (!geoAspects.all.length) {
      new AmplifyGeoOutputsAspect(this.getInstanceProps.outputStorageStrategy);
    }

    return amplifyPlace;
  };
}

/**
 * Integrate access for an AWS-managed place index within your backend.
 */
export const definePlace = (
  props: AmplifyPlaceFactoryProps,
): ConstructFactory<ResourceProvider<PlaceResources> & StackProvider> =>
  new AmplifyPlaceFactory(props);
