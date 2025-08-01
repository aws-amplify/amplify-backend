import { Construct } from 'constructs';
import { AmplifyCollectionProps, CollectionResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import { GeofenceCollection } from '@aws-cdk/aws-location-alpha';
import { CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';

const geoStackType = 'geo-Location';

/**
 * Amplify Collection CDK Construct
 *
 * Provisions a Collection through `alpha` L2 Construct
 */
export class AmplifyCollection
  extends Construct
  implements ResourceProvider<CollectionResources>, StackProvider
{
  readonly stack: Stack;
  readonly resources: CollectionResources;
  readonly name: string;
  readonly id: string;
  readonly isDefault: boolean;
  readonly policies: Policy[];

  /**
   *  Creates an instance of AmplifyCollection construct
   * @param scope - CDK stack where the construct should provision resources
   * @param id - CDK ID of Geofence Collection
   * @param props - properties of AmplifyCollection
   */
  constructor(scope: Construct, id: string, props: AmplifyCollectionProps) {
    super(scope, id);

    this.name = props.name;
    this.id = id;
    this.isDefault = props.isDefault || false;
    this.stack = Stack.of(scope);

    const geofenceCollection = new GeofenceCollection(this, id, {
      geofenceCollectionName: props.name,
      description: props.description,
      kmsKey: props.kmsKey,
    });
    this.resources = {
      policies: this.policies,
      cfnResources: {
        cfnCollection: geofenceCollection.node.findChild(
          'Resource',
        ) as CfnGeofenceCollection,
      },
    };

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      geoStackType,
      fileURLToPath(new URL('../package.json', import.meta.url)),
    );
  }
}
