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
      !(node instanceof AmplifyCollection) &&
      this.isGeoOutputProcessed
    ) {
      return;
    }

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
          instance.resources.collection?.geofenceCollectionName;
      } else if (instance.isDefault && defaultCollectionName) {
        // if default exists and instance is default (throw multiple defaults error)
        throw new AmplifyUserError('MultipleDefaultCollectionError', {
          message:
            'Multiple instances of geofence collections have been marked as default.',
          resolution:
            'Remove `isDefault: true` from all but one `defineCollection` call.',
        });
      }
    });

    if (collectionCount === 1 && !defaultCollectionName) {
      // if no defaults and only one construct, instance assumed to be default
      defaultCollectionName =
        currentNode.resources.collection?.geofenceCollectionName;
    } else if (collectionCount > 1 && !defaultCollectionName) {
      // if multiple constructs with default collection, throw error
      throw new AmplifyUserError('NoDefaultCollectionError', {
        message:
          'No instances of geofence collections have been marked as default.',
        resolution:
          'Add `isDefault: true` to one of the `defineCollection` calls.',
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
    this.validateDefaultCollection(collections, collections[0]);

    outputStorageStrategy.addBackendOutputEntry(geoOutputKey, {
      version: '1',
      payload: {
        aws_region: region,
      },
    });

    collections.forEach((collection) => {
      if (collection.isDefault) {
        outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
          version: '1',
          payload: {
            geofence_collections: JSON.stringify({
              default: collection.resources.collection.geofenceCollectionName,
              items: collection.resources.collection.geofenceCollectionName,
            }),
          },
        });
      } else {
        outputStorageStrategy.appendToBackendOutputList(geoOutputKey, {
          version: '1',
          payload: {
            geofence_collections: JSON.stringify({
              items: collection.resources.collection.geofenceCollectionName,
            }),
          },
        });
      }
    });
  }
}
