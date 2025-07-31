import {
  BackendOutputStorageStrategy,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
} from '@aws-amplify/plugin-types';
import { GeoOutput } from '@aws-amplify/backend-output-schemas';
import { CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
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
   * @todo update link with geo documentation
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
   * @todo update link with geo documentation
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
   * @todo update link with geo documentation
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
};

export type AmplifyPlaceProps = {
  name: string;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
};

export type AmplifyCollectionProps = {
  name: string;
  collectionDescription?: string;
  kmsKey?: kms.IKey;
  isDefault?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
};

/**
 * Backend-accessible resources from AmplifyMap
 * @param policies - access policies of the frontend-accessible map resource
 */
export type MapResources = {
  policies: Policy[];
  region: string;
};

/**
 * Backend-accessible resources from AmplifyPlace
 * @param policies - access policies of the frontend-accessible place resource
 */
export type PlaceResources = {
  policies: Policy[];
  region: string;
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

// ----------------------------------- access definitions ----------------------------------------------

export type GeoAccessGenerator = (
  allow: GeoAccessBuilder,
) => GeoAccessDefinition[];

export type GeoAccessBuilder = {
  authenticated: GeoActionBuilder;
  guest: GeoActionBuilder;
  groups: (groupNames: string[]) => GeoActionBuilder;
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

export type GeoResourceType = 'map' | 'place' | 'collection';
