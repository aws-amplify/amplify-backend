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
          'Multiple `defineMap` calls not permitted within an Amplify backend',
        resolution: 'Maintain one `defineMap` call',
      });
    }
    AmplifyMapFactory.mapCount++;
  }

  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): AmplifyMap => {
    // get construct factory instance properties
    const { constructContainer, resourceNameValidator } = getInstanceProps;

    // validates the user-entered resource name (according to CDK naming regulations)
    resourceNameValidator?.validate(this.props.name);

    // generates a singleton container entry for this construct factory
    if (!this.geoGenerator) {
      this.geoGenerator = new AmplifyMapGenerator(this.props, getInstanceProps);
    }

    // this getOrCompute accesses the internal construct container cache
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

    amplifyMap.resources.policies = geoAccessOrchestrator.orchestrateGeoAccess(
      amplifyMap.getResourceArn(),
      'map',
    );

    const geoAspects = Aspects.of(Stack.of(amplifyMap));
    if (!geoAspects.all.length) {
      new AmplifyGeoOutputsAspect(this.getInstanceProps.outputStorageStrategy);
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
