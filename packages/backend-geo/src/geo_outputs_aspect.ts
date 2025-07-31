import { IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyCollection } from './collection_construct.js';
import { AmplifyMap } from './map_resource.js';
import { AmplifyPlace } from './place_resource.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { GeoOutput, geoOutputKey } from '@aws-amplify/backend-output-schemas';
import { GeoResourceType, ResourceOutputs } from './types.js';

export type GeoResource = AmplifyMap | AmplifyPlace | AmplifyCollection;

/**
 * Aspect Implementation for Geo Resources
 */
export class AmplifyGeoOutputsAspect implements IAspect {
  /**
   * Steps to be accomplished within this class:
   * 1. constructor setup (receives output strategy -> schema)
   * 2. default collection processing (multiplicity error handling)
   * 3. store the outputs for all collections within outputStorageStrategy
   */
  isGeoOutputProcessed: boolean = false;
  defaultCollectionName: string | undefined = undefined;
  private readonly geoOutputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>;
  /**
   * Constructs an instance of the AmplifyGeoOutputsAspect
   * @param outputStorageStrategy - storage schema for Geo outputs
   */
  constructor(outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>) {
    this.geoOutputStorageStrategy = outputStorageStrategy;
  }

  /**
   * Interface requirement of IAspect that is called during CDK synthesis time
   * @param node - current construct
   */
  public visit(node: IConstruct): void {
    if (
      !(node instanceof AmplifyMap) &&
      !(node instanceof AmplifyPlace) &&
      !(node instanceof AmplifyCollection)
    ) {
      return;
    }

    if (this.isGeoOutputProcessed) return;

    this.isGeoOutputProcessed = true; // once this is visited, shouldn't process geo outputs again

    const mapInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyMap,
    ) as AmplifyMap[];

    const placeInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyPlace,
    ) as AmplifyPlace[];

    const collectionInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyCollection,
    ) as AmplifyCollection[];

    if (
      mapInstances.length > 0 ||
      placeInstances.length > 0 ||
      collectionInstances.length > 0
    ) {
      this.configureBackendOutputs(
        collectionInstances,
        mapInstances,
        placeInstances,
        this.geoOutputStorageStrategy,
        Stack.of(node).region,
      );
    }
  }

  private validateDefault = (
    nodes: GeoResource[],
    currentNode: GeoResource,
    resourceType: GeoResourceType,
  ) => {
    const resourceCount = nodes.length;

    let defaultNode: GeoResource | undefined = undefined;
    const defineName =
      resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

    // go through all children and find the default (make duplicity check on defaults)
    nodes.forEach((instance) => {
      if (!defaultNode && instance.isDefault) {
        // if no default exists and instance is default, mark it
        defaultNode = instance;
      } else if (instance.isDefault && defaultNode) {
        // if default exists and instance is default (throw multiple defaults error)
        throw new AmplifyUserError(`MultipleDefault${defineName}Error`, {
          message: `More than one default ${resourceType} set in the Amplify project`,
          resolution: `Remove 'isDefault: true' from all 'define${defineName}' calls except for one in your Amplify project`,
        });
      }
    });

    if (!defaultNode && resourceCount === 1) {
      // if no defaults and only one construct, instance assumed to be default
      defaultNode = currentNode;
    } else if (resourceCount > 1 && !defaultNode) {
      // if multiple constructs with default collection, throw error
      throw new AmplifyUserError(`NoDefault${defineName}Error`, {
        message: `No default ${resourceType} set in the Amplify project`,
        resolution: `Add 'isDefault: true' to one of the 'define${defineName}' calls in your Amplify project`,
      });
    }

    return defaultNode;
  };

  /**
   * Function responsible for add all collection outputs (with defaults)
   * @param collections - all construct instances of Amplify Geo
   * @param maps - all map resources of Amplify Geo
   * @param places - all place index resources of Amplify Geo
   * @param outputStorageStrategy - backend output schema of type GeoOutput
   * @param region - region of geo resources
   */
  private configureBackendOutputs(
    collections: AmplifyCollection[],
    maps: AmplifyMap[],
    places: AmplifyPlace[],
    outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>,
    region: string,
  ) {
    const defaultCollection = this.validateDefault(
      collections,
      collections[0],
      'collection',
    ) as AmplifyCollection;

    const defaultMap = this.validateDefault(maps, maps[0], 'map') as AmplifyMap;

    const defaultPlace = this.validateDefault(
      places,
      places[0],
      'place',
    ) as AmplifyPlace;

    // Add the main geo output entry with aws_region (snake_case to match schema)
    outputStorageStrategy.addBackendOutputEntry(geoOutputKey, {
      version: '1',
      payload: {
        geoRegion: region,
      },
    });

    // Collect all collection names for the items array
    const collectionNames = collections.map(
      (collection) =>
        collection.resources.cfnResources.cfnCollection.collectionName,
    );

    const mapOutputs: ResourceOutputs[] = maps.map((map): ResourceOutputs => {
      return {
        name: map.name,
        apiKey: map.resources.cfnResources.cfnAPIKey?.ref,
      };
    });

    const placeOutputs: ResourceOutputs[] = places.map(
      (place): ResourceOutputs => {
        return {
          name: place.name,
          apiKey: place.resources.cfnResources.cfnAPIKey?.ref,
        };
      },
    );

    // Add geofence_collections as a single entry with all collections
    if (collections.length > 0 && defaultCollection)
      this.addOutput(
        outputStorageStrategy,
        'geofenceCollections',
        defaultCollection.resources.cfnResources.cfnCollection.collectionName,
        collectionNames,
      );

    // Add maps as a single entry with all maps
    if (maps.length > 0 && defaultMap)
      this.addOutput(outputStorageStrategy, 'map', defaultMap.name, mapOutputs);

    // Add index as a single entry with all place indices
    if (places.length > 0 && defaultPlace)
      this.addOutput(
        outputStorageStrategy,
        'searchIndices',
        defaultPlace.name,
        placeOutputs,
      );
  }

  private addOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>,
    resourceKey: string,
    defaultResource: string,
    items: (string | ResourceOutputs)[],
  ) => {
    outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
      version: '1',
      payload: {
        [resourceKey]: JSON.stringify({
          default: defaultResource,
          items: items,
        }),
      },
    });
  };
}
