import { AmplifyMapProps } from './types.js';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';
import { Aws, Resource } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Resource for AWS-managed Maps
 */
export class AmplifyMap
  extends Resource
  implements ResourceProvider<object>, StackProvider
{
  readonly resources: object;
  readonly id: string;
  readonly name: string;

  /**
   * Creates an instance of AmplifyMap
   */
  constructor(scope: Construct, id: string, props: AmplifyMapProps) {
    super(scope, id);
    this.name = props.name;
    this.id = id;
  }

  getResourceArn = (): string => {
    return `arn:${Aws.PARTITION}:geo-maps:${this.stack.region}::provider/default`;
  };
}
