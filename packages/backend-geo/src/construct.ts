import { Construct } from 'constructs';
import { AmplifyGeoProps, GeoResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  GeofenceCollection,
  GeofenceCollectionProps,
} from '@aws-cdk/aws-location-alpha';
import { CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';

/**
 * Amplify Geo CDK Construct
 *
 * Designed as a wrapper around a Geofence Collection provided by Amazon Location Services.
 */
export class AmplifyGeo
  extends Construct
  implements ResourceProvider<GeoResources>, StackProvider
{
  readonly stack: Stack; // current stack
  readonly resources: GeoResources;
  readonly name: string; // construct name
  readonly id: string;

  /**
   * Constructs a new AmplifyGeo instance
   */
  constructor(scope: Construct, id: string, props: AmplifyGeoProps) {
    super(scope, id); // call to Construct class as part of inheritance
    this.name = props.name;
    this.id = id;
    if (props.collectionProps) {
      const geofenceCollectionProps: GeofenceCollectionProps = {
        // property mapping
        geofenceCollectionName: props.collectionProps.geofenceCollectionName,
        description: props.collectionProps.description,
        kmsKey: props.collectionProps.kmsKey,
      };

      const geofenceCollection = new GeofenceCollection(
        this,
        id,
        geofenceCollectionProps,
      ); // L2 construct call

      this.resources = {
        collection: geofenceCollection,
        cfnResources: {
          cfnCollection: geofenceCollection.node.findChild(
            'Resource',
          ) as CfnGeofenceCollection, // getting L1 child instance
        },
      };
    }
  }
}
