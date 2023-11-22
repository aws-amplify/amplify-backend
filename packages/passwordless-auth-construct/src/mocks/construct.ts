import assert from 'assert';
import { Match, Template } from 'aws-cdk-lib/assertions';

/**
 * Finds the IAM policy resource given the partial policy and name
 * @param template - The template to find the policy in.
 * @param resourceNameLike - The pattern for the resources name.
 * @param policy - The partial policy statement.
 * @returns the policy if found, otherwise returns undefined.
 */
export const findPolicyResource = (
  template: Template,
  resourceNameLike: RegExp,
  policy: Record<string, any>
):
  | {
      [key: string]: any;
    }
  | undefined => {
  const resources = template.findResources('AWS::IAM::Policy', {
    Properties: {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike(policy)]),
      },
    },
  });
  const keys = Object.keys(resources);
  const matchingKeys = keys.filter((key) => key.match(resourceNameLike));
  assert(
    matchingKeys.length <= 1,
    `Expected to find at most 1 resource, but found ${keys.length}`
  );
  if (matchingKeys.length == 0) {
    return;
  }
  return resources[matchingKeys[0]];
};

/**
 * Returns the environment variables for the lambda matching the resource name.
 * @param template - The template with the lambda.
 * @param resourceNameLike - The pattern for the resources name.
 * @returns the environment variables.
 */
export const getLambdaEnvironmentVariables = (
  template: Template,
  resourceNameLike: RegExp
): Record<string, string> => {
  const resources = template.findResources('AWS::Lambda::Function');
  const keys = Object.keys(resources);
  const matchingKeys = keys.filter((key) => key.match(resourceNameLike));
  assert(
    matchingKeys.length == 1,
    `Expected to find exactly 1 resource, but found ${keys.length}`
  );
  const resource = resources[matchingKeys[0]];
  return resource['Properties']['Environment']['Variables'];
};
