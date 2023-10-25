import { StackResourceSummary } from '@aws-sdk/client-cloudformation';

/**
 * Generates a link to a resource in the AWS Console
 */
export class ConsoleLinkGenerator {
  /**
   * Generates an AWS Console link to the stack resource
   */
  generateLink = (
    stackResourceSummary: StackResourceSummary,
    region: string
  ): string | undefined => {
    if (
      !stackResourceSummary.ResourceType ||
      !this.getTypeMappings(stackResourceSummary, region)[
        stackResourceSummary.ResourceType
      ]
    ) {
      return;
    }

    return `${this.getConsoleBaseUrl(region)}/${
      this.getTypeMappings(stackResourceSummary, region)[
        stackResourceSummary.ResourceType
      ]
    }`;
  };

  private getTypeMappings = (
    stackResourceSummary: StackResourceSummary,
    region: string
  ): { [resourceType: string]: string } => {
    // Supported keys from https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html
    return {
      'AWS::Cognito::UserPool': `cognito/v2/idp/user-pools/${
        stackResourceSummary.PhysicalResourceId as string
      }/users?region=${region}`,
      'AWS::Cognito::IdentityPool': `cognito/v2/identity/identity-pools/${
        stackResourceSummary.PhysicalResourceId as string
      }/user-statistics?region=${region}`,
      'AWS::IAM::Role': `iamv2/home?region=${region}#/roles/details/${
        stackResourceSummary.PhysicalResourceId as string
      }?section=permissions`,
      'AWS::DynamoDB::Table': `dynamodbv2/home?region=${region}#table?name=${
        stackResourceSummary.PhysicalResourceId as string
      }`,
      'AWS::S3::Bucket': `s3/home?region=${region}&bucket=${
        stackResourceSummary.PhysicalResourceId as string
      }`,
      'AWS::Lambda::Function': `lambda/home?region=${region}#functions/${
        stackResourceSummary.PhysicalResourceId as string
      }`,
    };
  };

  private getConsoleBaseUrl = (region: string): string => {
    return `https://${region}.console.aws.amazon.com`;
  };
}
