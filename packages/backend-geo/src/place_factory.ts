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
import { AllowPlacesAction } from '@aws-cdk/aws-location-alpha';

/**
 * Construct Factory for AmplifyPlace
 */
export class AmplifyPlaceFactory
  implements ConstructFactory<ResourceProvider<PlaceResources>>
{
  static placeCount: number = 0;

  private geoGenerator: ConstructContainerEntryGenerator;
  private geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory =
    new GeoAccessOrchestratorFactory();

  /**
   * Constructs a new AmplifyPlaceFactory instance
   * @param props - place resource properties
   */
  constructor(private readonly props: AmplifyPlaceFactoryProps) {
    if (AmplifyPlaceFactory.placeCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `definePlace` calls not permitted within an Amplify backend',
        resolution: 'Maintain one `definePlace` call',
      });
    }
    AmplifyPlaceFactory.placeCount++;
  }

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyPlace => {
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    resourceNameValidator?.validate(this.props.name);

    if (!this.geoGenerator) {
      this.geoGenerator = new AmplifyPlaceGenerator(
        this.props,
        getInstanceProps,
      );
    }

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
    const amplifyPlace = new AmplifyPlace(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    if (!this.props.access) {
      return amplifyPlace;
    }

    Tags.of(amplifyPlace).add(TagName.FRIENDLY_NAME, this.props.name);

    const geoAccessOrchestrator = this.geoAccessOrchestratorFactory.getInstance(
      this.props.access,
      this.getInstanceProps,
      Stack.of(scope),
      [],
    );

    amplifyPlace.resources.policies =
      geoAccessOrchestrator.orchestrateGeoAccess(
        amplifyPlace.getResourceArn(),
        'place',
        amplifyPlace.name,
      );

    // orchestrateGeoAccess already called and ApiKey actions processed
    const placeActions =
      geoAccessOrchestrator.orchestrateKeyAccess() as AllowPlacesAction[];

    if (!placeActions.length && this.props.apiKeyProps) {
      throw new AmplifyUserError('NoApiKeyAccessError', {
        message:
          'No API key can be created for places without access definitions defined for it.',
        resolution: 'Add at least one place action in the access definition.',
      });
    } else {
      amplifyPlace.generateApiKey(placeActions);
    }

    const geoAspects = Aspects.of(Stack.of(amplifyPlace));
    if (!geoAspects.all.length) {
      geoAspects.add(
        new AmplifyGeoOutputsAspect(
          this.getInstanceProps.outputStorageStrategy,
        ),
      );
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
