import { AmplifyMapProps, MapResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { AllowMapsAction, ApiKey } from '@aws-cdk/aws-location-alpha';
import { Aws, Resource } from 'aws-cdk-lib';
import { CfnAPIKey } from 'aws-cdk-lib/aws-location';
import { Construct } from 'constructs';

/**
 * Resource for AWS-managed Maps
 */
export class AmplifyMap
  extends Resource
  implements ResourceProvider<MapResources>, StackProvider
{
  readonly resources: MapResources;
  readonly id: string;
  readonly name: string;
  private readonly props: AmplifyMapProps;

  /**
   * Creates an instance of AmplifyMap
   */
  constructor(scope: Construct, id: string, props: AmplifyMapProps) {
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
    return `arn:${Aws.PARTITION}:geo-maps:${this.stack.region}::provider/default`;
  };

  generateApiKey = (actions: AllowMapsAction[]) => {
    this.resources.apiKey = new ApiKey(this, this.props.name, {
      ...this.props.apiKeyProps,
      noExpiry: this.props.apiKeyProps?.noExpiry ?? true,
      allowMapsActions: actions,
    });
    this.resources.cfnResources.cfnAPIKey =
      this.resources.apiKey.node.findChild('Resource') as CfnAPIKey;
  };
}
