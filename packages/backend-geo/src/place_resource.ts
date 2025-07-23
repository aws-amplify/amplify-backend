import { AmplifyPlaceProps, PlaceResources } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Aws, Resource } from 'aws-cdk-lib';
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

  /**
   * Creates an instance of AmplifyPlace
   */
  constructor(scope: Construct, id: string, props: AmplifyPlaceProps) {
    super(scope, id);

    this.name = props.name;
  }

  getResourceArn = (): string => {
    return `arn:${Aws.PARTITION}:geo-places:${this.stack.region}::provider/default`;
  };

  getResourceName = (): string => {
    return this.name;
  };
}
