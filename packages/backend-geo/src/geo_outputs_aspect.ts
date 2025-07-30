import { IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyCollection } from './collection_construct.js';
import { AmplifyMap } from './map_resource.js';
import { AmplifyPlace } from './place_resource.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { GeoOutput, geoOutputKey } from '@aws-amplify/backend-output-schemas';
import { GeoResource, ResourceOutputs } from './types.js';
import { CfnAPIKey } from 'aws-cdk-lib/aws-location';

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
      this.addBackendOutput(
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
  ) => {
    const collectionCount = nodes.length;

    let defaultNode: GeoResource | undefined = undefined;

    // go through all children and find the default (make duplicity check on defaults)
    nodes.forEach((instance) => {
      if (!defaultNode && instance.isDefault) {
        // if no default exists and instance is default, mark it
        defaultNode = instance;
      } else if (instance.isDefault && defaultNode) {
        // if default exists and instance is default (throw multiple defaults error)
        throw new AmplifyUserError('MultipleDefaultCollectionError', {
          message:
            'More than one default geofence collection set in the Amplify project',
          resolution:
            'Remove `isDefault: true` from all `defineCollection` calls except for one in your Amplify project',
        });
      }
    });

    if (!defaultNode && collectionCount === 1) {
      // if no defaults and only one construct, instance assumed to be default
      defaultNode = currentNode;
    } else if (collectionCount > 1 && !defaultNode) {
      // if multiple constructs with default collection, throw error
      throw new AmplifyUserError('NoDefaultCollectionError', {
        message: 'No default geofence collection set in the Amplify project',
        resolution:
          'Add `isDefault: true` to one of the `defineCollection` calls in your Amplify project',
      });
    }

    return defaultNode;
  };

  private validateKeys = (nodes: GeoResource[]) => {
    const apiKeys: CfnAPIKey[] = [];
    // finding duplicate api keys (same actions)
    nodes.forEach((node) => {
      if (
        !(node instanceof AmplifyCollection) &&
        node.resources.cfnResources.cfnAPIKey
      )
        apiKeys.push(node.resources.cfnResources.cfnAPIKey);
    });

    const hasDuplicates = apiKeys.some((key, index) => {
      apiKeys
        .slice(index + 1)
        .some(
          (secondKey) =>
            JSON.stringify(key.restrictions) ===
            JSON.stringify(secondKey.restrictions),
        );
    });

    if (hasDuplicates)
      throw new AmplifyUserError('DuplicateAPIKeyError', {
        message:
          'Multiple api keys with the same actions have been created for this resource.',
        resolution:
          'Remove all api keys for this region with the same actions for this resource.',
      });
  };

  /**
   * Function responsible for add all collection outputs (with defaults)
   * @param collections - all construct instances of Amplify Geo
   * @param maps - all map resources of Amplify Geo
   * @param places - all place index resources of Amplify Geo
   * @param outputStorageStrategy - backend output schema of type GeoOutput
   * @param region - region of geo resources
   */
  private addBackendOutput(
    collections: AmplifyCollection[],
    maps: AmplifyMap[],
    places: AmplifyPlace[],
    outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>,
    region: string,
  ) {
    const defaultCollection = this.validateDefault(
      collections,
      collections[0],
    ) as AmplifyCollection;

    const defaultMap = this.validateDefault(maps, maps[0]) as AmplifyMap;

    this.validateKeys(maps);

    const defaultPlace = this.validateDefault(
      places,
      places[0],
    ) as AmplifyPlace;

    this.validateKeys(places);

    // Add the main geo output entry with aws_region (snake_case to match schema)
    outputStorageStrategy.addBackendOutputEntry(geoOutputKey, {
      version: '1',
      payload: {
        geoRegion: region,
      },
    });

    // Collect all collection names for the items array
    const collectionNames = collections.map(
      (collection) => collection.resources.collection.geofenceCollectionName,
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
    if (collections.length > 0 && defaultCollection) {
      outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
        version: '1',
        payload: {
          geofenceCollections: JSON.stringify({
            // Changed from geofenceCollections to geofence_collections
            default:
              defaultCollection.resources.collection.geofenceCollectionName,
            items: collectionNames, // Array of all collection names
          }),
        },
      });
    }
    if (maps.length > 0 && defaultMap) {
      outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
        version: '1',
        payload: {
          maps: JSON.stringify({
            default: defaultMap.name,
            items: mapOutputs,
          }),
        },
      });
    }
    if (places.length > 0 && defaultPlace) {
      outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
        version: '1',
        payload: {
          searchIndices: JSON.stringify({
            default: defaultPlace.name,
            items: placeOutputs,
          }),
        },
      });
    }
  }
}
