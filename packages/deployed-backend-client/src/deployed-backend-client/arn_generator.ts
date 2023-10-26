import { StackResourceSummary } from '@aws-sdk/client-cloudformation';

/**
 * Generates a link to a resource in the AWS Console
 */
export class ArnGenerator {
  private isArn = (potentialArn: string) => {
    return potentialArn.startsWith('arn:aws:');
  };

  /**
   * Generates an AWS Console link to the stack resource
   */
  generateArn = (
    stackResourceSummary: StackResourceSummary,
    region: string,
    accountId: string
  ): string | undefined => {
    // Supported keys from https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html
    const physicalResourceId =
      stackResourceSummary.PhysicalResourceId as string;

    // Some resources use arns directly as physicalResourceId.
    // These include: AWS::AppSync::GraphQLApi, AWS::AppSync::DataSource, AWS::CloudFormation::Stack, AWS::Lambda::LayerVersion
    if (this.isArn(physicalResourceId)) {
      return physicalResourceId;
    }

    switch (stackResourceSummary.ResourceType) {
      case 'AWS::Cognito::UserPool':
        return `arn:aws:cognito-idp:${region}:${accountId}:userpool/${physicalResourceId}`;
      case 'AWS::Cognito::IdentityPool':
        return `arn:aws:cognito-identity:${region}:${accountId}:identitypool/${physicalResourceId}`;
      case 'AWS::IAM::Role':
        return `arn:aws:iam:${region}:${accountId}:role/${physicalResourceId}`;
      case 'AWS::DynamoDB::Table':
        return `arn:aws:dynamodb:${region}:${accountId}:table/${physicalResourceId}`;
      case 'AWS::S3::Bucket':
        return `arn:aws:s3:::${physicalResourceId}`;
      case 'AWS::Lambda::Function':
        return `arn:aws:lambda:${region}:${accountId}:function:${physicalResourceId}`;
      default:
        break;
    }

    return;
  };
}
