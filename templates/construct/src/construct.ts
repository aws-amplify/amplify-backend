import { Construct } from 'constructs';
import { aws_sqs as sqs } from 'aws-cdk-lib';

export interface ConstructCognitoProps {
  includeQueue?: boolean;
}

/**
 * Hello world construct implementation
 */
export class AmplifyConstruct extends Construct {
  /**
   * Create a new AmplifyConstruct
   */
  constructor(scope: Construct, id: string, props: ConstructCognitoProps = {}) {
    super(scope, id);

    if (props.includeQueue) {
      new sqs.Queue(this, 'placeholder');
    }
  }
}
