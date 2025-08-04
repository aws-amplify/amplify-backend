import { IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyCollection } from './collection_construct.js';
import { AmplifyMap } from './map_resource.js';
import { AmplifyPlace } from './place_resource.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { GeoOutput, geoOutputKey } from '@aws-amplify/backend-output-schemas';

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
        this.geoOutputStorageStrategy,
        Stack.of(node).region,
      );
    }
  }

  private validateDefaultCollection = (
    nodes: AmplifyCollection[],
    currentNode: AmplifyCollection,
  ) => {
    const collectionCount = nodes.length;

    let defaultCollectionName: string | undefined = undefined;

    // go through all children and find the default (make duplicity check on defaults)
    nodes.forEach((instance) => {
      if (!defaultCollectionName && instance.isDefault) {
        // if no default exists and instance is default, mark it
        defaultCollectionName =
          instance.resources.cfnResources.cfnCollection.collectionName;
      } else if (instance.isDefault && defaultCollectionName) {
        // if default exists and instance is default (throw multiple defaults error)
        throw new AmplifyUserError('MultipleDefaultCollectionError', {
          message:
            'More than one default geofence collection set in the Amplify project',
          resolution:
            'Remove `isDefault: true` from all but one `defineCollection` calls except for one in your Amplify project',
        });
      }
    });

    if (collectionCount === 1 && !defaultCollectionName) {
      // if no defaults and only one construct, instance assumed to be default
      defaultCollectionName =
        currentNode.resources.cfnResources.cfnCollection.collectionName;
    } else if (collectionCount > 1 && !defaultCollectionName) {
      // if multiple constructs with default collection, throw error
      throw new AmplifyUserError('NoDefaultCollectionError', {
        message: 'No default geofence collection set in the Amplify project',
        resolution:
          'Add `isDefault: true` to one of the `defineCollection` calls in your Amplify project',
      });
    }

    return defaultCollectionName;
  };

  /**
   * Function responsible for add all collection outputs (with defaults)
   * @param collections - all construct instances of AmplifyGeo
   * @param outputStorageStrategy - backend output schema of type GeoOutput
   * @param region - region of geo resources
   */
  private addBackendOutput(
    collections: AmplifyCollection[],
    outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>,
    region: string,
  ) {
    const defaultCollectionName = this.validateDefaultCollection(
      collections,
      collections[0],
    );

    // Collect all collection names for the items array
    const collectionNames = collections.map(
      (collection) =>
        collection.resources.cfnResources.cfnCollection.collectionName,
    );

    // Add the main geo output entry with aws_region (snake_case to match schema)
    outputStorageStrategy.addBackendOutputEntry(geoOutputKey, {
      version: '1',
      payload: {
        geoRegion: region,
        geofenceCollections: JSON.stringify({
          // Changed from geofenceCollections to geofence_collections
          default: defaultCollectionName,
          items: collectionNames, // Array of all collection names
        }),
      },
    });

    // // Add geofence_collections as a single entry with all collections
    // if (collections.length > 0 && defaultCollectionName) {
    //   outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
    //     version: '1',
    //     payload: {
    //       geofenceCollections: JSON.stringify({
    //         // Changed from geofenceCollections to geofence_collections
    //         default: defaultCollectionName,
    //         items: collectionNames, // Array of all collection names
    //       }),
    //     },
    //   });
    // }
  }
}
