import {
  BackendOutputStorageStrategy,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import { GeoOutput } from '@aws-amplify/backend-output-schemas';
import {
  GeofenceCollection,
  GeofenceCollectionProps,
} from '@aws-cdk/aws-location-alpha';
import { CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { AmplifyUserErrorOptions } from '@aws-amplify/platform-core';

// ----------------------------------- factory properties ----------------------------------------------

// factory properties include construct properties without output strategy (because that's loaded inside factory)
export type AmplifyGeoFactoryProps = Omit<
  AmplifyGeoProps,
  'outputStorageStrategy'
> & {
  region: string;
  access: GeoAccessGenerator;
  resourceIdentifier?: GeoResourceType;
};

export type AmplifyGeoProps = {
  name: string;
  collectionProps?: GeofenceCollectionProps;

  outputStorageStrategy?: BackendOutputStorageStrategy<GeoOutput>;
};

export type GeoResources = {
  collection: GeofenceCollection;
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
  // access builder (within defineX())
  to: (actions: GeoAction[]) => GeoAccessDefinition;
};

export type GeoAccessDefinition = {
  userRoles: ((getInstanceProps: ConstructFactoryGetInstanceProps) => IRole)[];
  actions: GeoAction[];
  uniqueDefinitionValidators: {
    uniqueRoleToken: string;
    validationErrorOptions: AmplifyUserErrorOptions;
  }[];
};

// ----------------------------------- misc. types ----------------------------------------------

export type MapAction = 'get';

export type IndexAction = 'autocomplete' | 'geocode' | 'search';

export type CollectionAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export type GeoAction = MapAction | IndexAction | CollectionAction;

export const geoCfnResourceTypes = ['collection'];

export const geoManagedResourceTypes = ['map', 'place'];

export type GeoResourceType = 'map' | 'place' | 'collection';
