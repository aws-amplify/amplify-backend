import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { AmplifyPlaceProps, PlaceResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { AllowPlacesAction, ApiKey } from '@aws-cdk/aws-location-alpha';
import { Aws, Resource, Stack } from 'aws-cdk-lib';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { CfnAPIKey } from 'aws-cdk-lib/aws-location';
import { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';

const geoStackType = 'geo-Location';
/**
 * Resource for AWS-managed Place Indices
 */
export class AmplifyPlace
  extends Resource
  implements ResourceProvider<PlaceResources>, StackProvider
{
  readonly resources: PlaceResources;
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly policies: Policy[];
  private readonly props: AmplifyPlaceProps;

  /**
   * Creates an instance of AmplifyPlace
   */
  constructor(scope: Construct, id: string, props: AmplifyPlaceProps) {
    super(scope, id);

    this.name = props.name;
    this.id = id;
    this.isDefault = props.isDefault || false;

    this.props = props;

    this.resources = {
      region: this.stack.region,
      policies: this.policies,
      cfnResources: {},
    };

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      geoStackType,
      fileURLToPath(new URL('../package.json', import.meta.url)),
    );
  }

  getResourceArn = (): string => {
    return `arn:${Aws.PARTITION}:geo-places:${this.stack.region}::provider/default`;
  };

  generateApiKey = (actions: AllowPlacesAction[]) => {
    this.resources.apiKey = new ApiKey(this, this.props.name, {
      ...this.props.apiKeyProps,
      noExpiry: this.props.apiKeyProps?.noExpiry ?? true,
      allowPlacesActions: actions,
    });

    this.resources.cfnResources.cfnAPIKey =
      this.resources.apiKey.node.findChild('Resource') as CfnAPIKey;
  };
}
