import {
  BackendOutputStorageStrategy,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
} from '@aws-amplify/plugin-types';
import { GeoOutput } from '@aws-amplify/backend-output-schemas';
import {
  AllowMapsAction,
  AllowPlacesAction,
  ApiKey,
  ApiKeyProps,
  GeofenceCollection,
  GeofenceCollectionProps,
} from '@aws-cdk/aws-location-alpha';
import { CfnAPIKey, CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
import { AmplifyUserErrorOptions } from '@aws-amplify/platform-core';
import { Policy } from 'aws-cdk-lib/aws-iam';

// ----------------------------------- factory properties ----------------------------------------------

/**
 * Properties of AmplifyMap
 */
export type AmplifyMapFactoryProps = Omit<
  AmplifyMapProps,
  'outputStorageStrategy'
> & {
  /**
   *  access definition for maps (@see https://docs.amplify.aws/react/build-a-backend/auth/grant-access-to-auth-resources/ for more information)
   * @example
   * const map = defineMap({
   *  access: (allow) => (
   *      allow.authenticated.to(["get"])
   *  )
   * })
   */
  access?: GeoAccessGenerator;
};

/**
 * Properties of AmplifyPlace
 */
export type AmplifyPlaceFactoryProps = Omit<
  AmplifyPlaceProps,
  'outputStorageStrategy'
> & {
  /**
   *  access definition for maps (@see https://docs.amplify.aws/react/build-a-backend/auth/grant-access-to-auth-resources/ for more information)
   * @example
   * const index = definePlace({
   *  access: (allow) => (
   *      allow.authenticated.to(["geocode"])
   *  )
   * })
   */
  access?: GeoAccessGenerator;
};

/**
 * Properties of AmplifyCollection
 */
export type AmplifyCollectionFactoryProps = Omit<
  AmplifyCollectionProps,
  'outputStorageStrategy'
> & {
  /**
   *  access definition for maps (@see https://docs.amplify.aws/react/build-a-backend/auth/grant-access-to-auth-resources/ for more information)
   * @example
   * const collection = defineCollection({
   *  access: (allow) => (
   *      allow.authenticated.to(["create"])
   *  )
   * })
   */
  access?: GeoAccessGenerator;
};

export type AmplifyMapProps = Omit<
  AmplifyCollectionProps,
  'collectionProps' | 'isDefault'
> & {
  apiKeyProps?: GeoApiKeyProps;
};

export type AmplifyPlaceProps = Omit<
  AmplifyCollectionProps,
  'collectionProps' | 'isDefault'
> & {
  apiKeyProps?: GeoApiKeyProps;
};

export type AmplifyCollectionProps = {
  name: string;
  collectionProps: GeofenceCollectionProps;
  isDefault?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
};

export type GeoApiKeyProps = Omit<
  ApiKeyProps,
  'allowMapsActions' | 'allowPlacesActions'
>;

/**
 * Backend-accessible resources from AmplifyMap
 * @param policies - access policies of the frontend-accessible map resource
 */
export type MapResources = {
  region: string;
  policies: Policy[];
  apiKey?: ApiKey;
  cfnResources: {
    cfnAPIKey?: CfnAPIKey;
  };
};

/**
 * Backend-accessible resources from AmplifyPlace
 * @param policies - access policies of the frontend-accessible place resource
 */
export type PlaceResources = {
  region: string;
  policies: Policy[];
  apiKey?: ApiKey;
  cfnResources: {
    cfnAPIKey?: CfnAPIKey;
  };
};

/**
 * Backend-accessible resources from AmplifyCollection
 * @param collection - provisioned geofence collection resource
 * @param policies - access policies of the provisioned collection resource
 * @param cfnResources - cloudformation resources exposed from the abstracted collection provisioned from collection
 */
export type CollectionResources = {
  policies: Policy[];
  collection: GeofenceCollection;
  cfnResources: {
    cfnCollection: CfnGeofenceCollection;
  };
};

// ----------------------------------- access definitions ----------------------------------------------

export type GeoAccessGenerator = (
  allow: GeoAccessBuilder,
) => GeoAccessDefinition[];

export type GeoCollectionAccessGenerator = (
  allow: Omit<GeoAccessBuilder, 'apiKey'>,
) => GeoAccessDefinition[];

export type GeoAccessBuilder = {
  authenticated: GeoActionBuilder;
  guest: GeoActionBuilder;
  groups: (groupNames: string[]) => GeoActionBuilder;
  apiKey?: GeoActionBuilder;
};

export type GeoActionBuilder = {
  to: (actions: string[]) => GeoAccessDefinition;
};

export type GeoAccessDefinition = {
  getAccessAcceptors: ((
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ) => ResourceAccessAcceptor)[];
  actions: string[];
  uniqueDefinitionValidators: {
    uniqueRoleToken: string;
    validationErrorOptions: AmplifyUserErrorOptions;
  }[];
};

// ----------------------------------- misc. types ----------------------------------------------

export const resourceActionRecord: Record<string, string[]> = {
  map: ['get'],
  place: ['autocomplete', 'geocode', 'search'],
  collection: ['create', 'read', 'update', 'delete', 'list'],
};

export type GeoApiActionType = AllowMapsAction | AllowPlacesAction;

export type GeoResourceType = 'map' | 'place' | 'collection';
