import { AmplifyPlaceProps } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Aws, Resource } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Resource for AWS-managed Place Indices
 */
export class AmplifyPlace
  extends Resource
  implements ResourceProvider<object>, StackProvider
{
  readonly id: string;
  readonly name: string;
  readonly resources: object;

  /**
   * Creates an instance of AmplifyPlace
   */
  constructor(scope: Construct, id: string, props: AmplifyPlaceProps) {
    super(scope, id);

    this.name = props.name;
    this.id = id;
  }

  getResourceArn = (): string => {
    return `arn:${Aws.PARTITION}:geo-places:${this.stack.region}::provider/default`;
  };

  getResourceName = (): string => {
    return this.name;
  };
}
