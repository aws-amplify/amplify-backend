import { IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyCollection } from './collection_construct.js';
import { AmplifyMap } from './map_resource.js';
import { AmplifyPlace } from './place_resource.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { GeoOutput, geoOutputKey } from '@aws-amplify/backend-output-schemas';
import { GeoResourceType } from './types.js';
import {
  AllowMapsAction,
  AllowPlacesAction,
  ApiKey,
} from '@aws-cdk/aws-location-alpha';
import { randomBytes } from 'crypto';
import { CfnAPIKey } from 'aws-cdk-lib/aws-location';

type GeoResource = AmplifyMap | AmplifyPlace | AmplifyCollection;

type LocationApiKeyResource = AmplifyMap | AmplifyPlace;

type ResourceOutputs = {
  name?: string;
  apiKeyName?: string;
};

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
  private readonly geoOutputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>;

  private apiKeyResources: Partial<
    Record<GeoResourceType, LocationApiKeyResource>
  > = {};
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

    this.apiKeyResources.map = mapInstances[0]; // only one instance of map allowed

    const placeInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyPlace,
    ) as AmplifyPlace[];

    this.apiKeyResources.place = placeInstances[0]; // only one instance of place allowed

    const collectionInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyCollection,
    ) as AmplifyCollection[];

    const apiKeyResourceCount = Object.keys(this.apiKeyResources).length;
    const geoResourceCount = apiKeyResourceCount + collectionInstances.length;

    if (geoResourceCount > 0) {
      if (apiKeyResourceCount > 0) {
        let generateGenericKey: boolean = true;
        // verify that all these keys need to be consolidated
        Object.entries(this.apiKeyResources).forEach(([key, resource]) => {
          // cannot have an existing API key with request for a generic API key
          if (resource.resources.apiKey && resource.merge)
            throw new AmplifyUserError('APIKeyMergeError', {
              message: `The ${key} resource in the stack has been marked as a API Key merge interest but already has a defined API key.`,
              resolution: `Mark all API Key properties with the 'merge: True' flag or remove the flag from all API key resource properties.`,
            });
          // if no merge and resource contains API key, no generic API key should be created
          else if (resource.resources.apiKey && !resource.merge)
            generateGenericKey = false;

          if (
            !JSON.stringify(
              resource.getApiKeyProps() ===
                JSON.stringify(this.apiKeyResources.map?.getApiKeyProps()),
            )
          )
            throw new AmplifyUserError('APIKeyPropertyMismatchError', {
              message: `The merge is incompatible due to mismatching properties from the ${key} API key resource.`,
              resolution: `Ensure all API key resources have the same properties or remove the 'merge: True' flag from all API key resources.`,
            });
        });

        // only generate generic key if required
        if (generateGenericKey)
          this.configureApiKey(node, this.apiKeyResources);
      }

      this.configureBackendOutputs(
        collectionInstances,
        mapInstances,
        placeInstances,
        this.geoOutputStorageStrategy,
        Stack.of(node).region,
      );
    }
  }

  private configureApiKey = (
    node: IConstruct,
    resources: Partial<Record<GeoResourceType, LocationApiKeyResource>>,
  ) => {
    // provisioning the new API key
    const genericKeyName: string = `amplify-${Object.keys(resources).join('-')}-api-key-${randomBytes(4).toString('hex')}`;
    const genericApiKey = new ApiKey(Stack.of(node), genericKeyName, {
      ...resources.map?.getApiKeyProps(),
      apiKeyName: genericKeyName.substring(0, -5),
      allowMapsActions:
        (resources.map?.getActions() as AllowMapsAction[]) || [],
      allowPlacesActions:
        (resources.place?.getActions() as AllowPlacesAction[]) || [],
    });

    // attaching each Amplify resource with the new generic API key
    for (const key in resources) {
      const resourceType = key as GeoResourceType;
      const resource = resources[resourceType];
      if (resource) {
        resource.resources.apiKey = genericApiKey;
        resource.resources.cfnResources.cfnAPIKey =
          genericApiKey.node.findChild('Resource') as CfnAPIKey;
      }
    }
  };

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

    const defaultMap = maps[0];

    const defaultPlace = places[0];

    // Collect all collection names for the items array
    const collectionNames = collections.map(
      (collection) =>
        collection.resources.cfnResources.cfnCollection.collectionName,
    );

    const mapOutputs: ResourceOutputs[] = maps.map((map): ResourceOutputs => {
      return {
        name: map.name,
        apiKeyName: map.resources.cfnResources.cfnAPIKey?.keyName,
      };
    });

    const placeOutputs: ResourceOutputs[] = places.map(
      (place): ResourceOutputs => {
        return {
          name: place.name,
          apiKeyName: place.resources.cfnResources.cfnAPIKey?.keyName,
        };
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geoPayload: any = {
      geoRegion: region, // same type as payload of V1 schema
    };

    // Add geofence_collections as a single entry with all collections
    if (collections.length > 0 && defaultCollection)
      this.addPayload(
        'geofenceCollections',
        defaultCollection.resources.cfnResources.cfnCollection.collectionName,
        collectionNames,
        geoPayload,
      );

    // Add maps as a single entry with all maps
    if (maps.length > 0 && defaultMap)
      this.addPayload('maps', defaultMap.name, mapOutputs, geoPayload);

    // Add index as a single entry with all place indices
    if (places.length > 0 && defaultPlace)
      this.addPayload(
        'searchIndices',
        defaultPlace.name,
        placeOutputs,
        geoPayload,
      );

    // Add the main geo output entry with aws_region (snake_case to match schema)
    outputStorageStrategy.addBackendOutputEntry(geoOutputKey, {
      version: '1',
      payload: geoPayload,
    });
  }
  private addPayload = (
    resourceKey: string,
    defaultResourceName: string,
    resources: (ResourceOutputs | string)[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentPayload: any, // type of payload from V1 schema
  ) => {
    currentPayload[resourceKey] = JSON.stringify({
      default: defaultResourceName,
      items: resources,
    });
  };
}
