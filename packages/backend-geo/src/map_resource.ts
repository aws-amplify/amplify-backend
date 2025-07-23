import { AmplifyMapProps, MapResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Aws, Resource } from 'aws-cdk-lib';
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

  /**
   * Creates an instance of AmplifyMap
   */
  constructor(scope: Construct, id: string, props: AmplifyMapProps) {
    super(scope, id);

    this.name = props.name;
  }

  getResourceArn = (): string => {
    return `arn:${Aws.PARTITION}:geo-maps:${this.stack.region}::provider/default`;
  };

  getResourceName = (): string => {
    return this.name;
  };
}
