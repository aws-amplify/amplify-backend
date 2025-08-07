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
import { AmplifyMapFactoryProps, MapResources } from './types.js';
import { GeoAccessOrchestratorFactory } from './geo_access_orchestrator.js';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import { AmplifyMap } from './map_resource.js';
import { AmplifyGeoOutputsAspect } from './geo_outputs_aspect.js';
import { AllowMapsAction } from '@aws-cdk/aws-location-alpha';

/**
 * Construct Factory for AmplifyMap
 */
export class AmplifyMapFactory
  implements ConstructFactory<ResourceProvider<MapResources>>
{
  static mapCount: number = 0;

  private geoGenerator: ConstructContainerEntryGenerator;
  private geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory =
    new GeoAccessOrchestratorFactory();

  /**
   * Constructs a new AmplifyMapFactory instance
   * @param props - map resource properties
   */
  constructor(private readonly props: AmplifyMapFactoryProps) {
    if (AmplifyMapFactory.mapCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineMap` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineMap` call',
      });
    }
    AmplifyMapFactory.mapCount++;
  }

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyMap => {
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    resourceNameValidator?.validate(this.props.name);

    if (!this.geoGenerator) {
      this.geoGenerator = new AmplifyMapGenerator(this.props, getInstanceProps);
    }

    return constructContainer.getOrCompute(this.geoGenerator) as AmplifyMap;
  };
}

/**
 * Construct Container Entry Generator for AmplifyMap
 */
export class AmplifyMapGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'geo';

  /**
   * Creates an instance of AmplifyMapGenerator
   */
  constructor(
    private readonly props: AmplifyMapFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    private readonly geoAccessOrchestratorFactory: GeoAccessOrchestratorFactory = new GeoAccessOrchestratorFactory(),
  ) {}

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<MapResources> => {
    const amplifyMap = new AmplifyMap(scope, this.props.name, {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
    });

    if (!this.props.access) {
      return amplifyMap;
    }

    const geoAccessOrchestrator = this.geoAccessOrchestratorFactory.getInstance(
      this.props.access,
      this.getInstanceProps,
      Stack.of(scope),
      [],
    );

    Tags.of(amplifyMap).add(TagName.FRIENDLY_NAME, this.props.name);

    geoAccessOrchestrator.orchestrateGeoAccess(
      amplifyMap.getResourceArn(),
      'map',
      amplifyMap.name,
    );

    // orchestrateGeoAccess already called and ApiKey actions processed
    const mapActions =
      geoAccessOrchestrator.orchestrateKeyAccess() as AllowMapsAction[];

    if (!mapActions.length && this.props.apiKeyProps) {
      throw new AmplifyUserError('NoApiKeyAccessError', {
        message:
          'No API key can be created for maps without access definitions defined for it.',
        resolution: 'Add at least one map action in the access definition.',
      });
    } else if (this.props.apiKeyProps) {
      amplifyMap.generateApiKey(mapActions);
    }

    const geoAspects = Aspects.of(Stack.of(amplifyMap));
    if (!geoAspects.all.length) {
      geoAspects.add(
        new AmplifyGeoOutputsAspect(
          this.getInstanceProps.outputStorageStrategy,
        ),
      );
    }

    return amplifyMap;
  };
}

/**
 * Integrate access for an AWS-managed map within your backend.
 */
export const defineMap = (
  props: AmplifyMapFactoryProps,
): ConstructFactory<ResourceProvider<MapResources> & StackProvider> =>
  new AmplifyMapFactory(props);
