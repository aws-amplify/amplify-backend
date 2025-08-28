import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { AmplifyPlaceProps, GeoApiKeyProps, PlaceResources } from './types.js';
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
  readonly merge: boolean;
  readonly policies: Policy[];
  readonly props: AmplifyPlaceProps;
  private actions: AllowPlacesAction[];

  /**
   * Creates an instance of AmplifyPlace
   */
  constructor(scope: Construct, id: string, props: AmplifyPlaceProps) {
    super(scope, id);

    this.name = props.name;
    this.id = id;

    this.merge = props.apiKeyProps?.merge || true;

    this.props = props;

    this.resources = {
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

  getApiKeyProps = (): GeoApiKeyProps => {
    return this.props.apiKeyProps ?? {};
  };

  getActions = (): AllowPlacesAction[] => {
    return this.actions;
  };

  setActions = (placeActions: AllowPlacesAction[]) => {
    this.actions = placeActions;
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
