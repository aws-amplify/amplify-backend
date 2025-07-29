import { AmplifyPlaceProps, PlaceResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { AllowPlacesAction, ApiKey } from '@aws-cdk/aws-location-alpha';
import { Aws, Resource } from 'aws-cdk-lib';
import { CfnAPIKey } from 'aws-cdk-lib/aws-location';
import { Construct } from 'constructs';

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
  private readonly props: AmplifyPlaceProps;

  /**
   * Creates an instance of AmplifyPlace
   */
  constructor(scope: Construct, id: string, props: AmplifyPlaceProps) {
    super(scope, id);

    this.name = props.name;
    this.id = id;

    this.props = props;

    this.resources = {
      region: this.stack.region,
      policies: [],
      cfnResources: {},
    };
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
