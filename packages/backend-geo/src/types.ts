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
} from '@aws-cdk/aws-location-alpha';
import { CfnAPIKey, CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
import { AmplifyUserErrorOptions } from '@aws-amplify/platform-core';
import { Policy } from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';

// ----------------------------------- factory properties ----------------------------------------------

/**
 * Properties of AmplifyMap
 */
export type AmplifyMapFactoryProps = Omit<
  AmplifyMapProps,
  'outputStorageStrategy'
> & {
  /**
   * @todo update with complete geo docs
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
   * @todo update with complete geo docs
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
   * @todo update with complete geo docs
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

export type AmplifyMapProps = {
  name: string;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
  apiKeyProps?: GeoApiKeyProps;
};

export type AmplifyPlaceProps = {
  name: string;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
  apiKeyProps?: GeoApiKeyProps;
};

export type AmplifyCollectionProps = {
  name: string;
  description?: string;
  kmsKey?: kms.IKey;
  isDefault?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
};

export type GeoApiKeyProps = Omit<
  ApiKeyProps,
  'allowMapsActions' | 'allowPlacesActions'
>;

// ----------------------------------- output properties ----------------------------------------------

/**
 * Backend-accessible resources from AmplifyMap
 * @param policies - access policies of the frontend-accessible map resource
 */
export type MapResources = {
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
  cfnResources: {
    cfnCollection: CfnGeofenceCollection;
  };
};

export type ResourceOutputs = {
  name: string;
  key?: string;
};

// ----------------------------------- access definitions ----------------------------------------------

export type GeoAccessGenerator = (
  allow: GeoAccessBuilder,
) => GeoAccessDefinition[];

export type GeoAccessBuilder = {
  authenticated: GeoActionBuilder;
  guest: GeoActionBuilder;
  groups: (groupNames: string[]) => GeoActionBuilder;
  apiKey: GeoActionBuilder;
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
export type GeoApiActionType = AllowMapsAction | AllowPlacesAction;

export type GeoResourceType = 'map' | 'place' | 'collection';
