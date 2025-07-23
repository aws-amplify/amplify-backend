import { Construct } from 'constructs';
import { AmplifyCollectionProps, CollectionResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import { GeofenceCollection } from '@aws-cdk/aws-location-alpha';
import { CfnGeofenceCollection } from 'aws-cdk-lib/aws-location';
import { Policy } from 'aws-cdk-lib/aws-iam';

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

    const geofenceCollection = new GeofenceCollection(
      this,
      id,
      props.collectionProps,
    );
    this.resources = {
      collection: geofenceCollection,
      policies: this.policies,
      cfnResources: {
        cfnCollection: geofenceCollection.node.findChild(
          'Resource',
        ) as CfnGeofenceCollection,
      },
    };
  }
}
