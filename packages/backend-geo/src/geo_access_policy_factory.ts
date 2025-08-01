import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { Stack } from 'aws-cdk-lib';

/**
 * Geo Access Policy Factory
 *
 * Responsible for policy statement generation and policy-role attachment.
 */
export class GeoAccessPolicyFactory {
  createPolicy = (
    permissions: string[], // organize create policy such that one resource type maps to the actions
    resourceArn: string,
    roleToken: string,
    resourceName: string,
    stack: Stack,
  ) => {
    if (permissions.length === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }

    // policy statements created for each resource type
    const policyStatement: PolicyStatement = new PolicyStatement();

    permissions.forEach((action) => {
      policyStatement.addActions(...actionDirectory[action]);
    });

    policyStatement.addResources(resourceArn);

    const policyIDName: string = `geo-${resourceName}-${roleToken}-access-policy`;
    return new Policy(stack, policyIDName, {
      policyName: policyIDName,
      statements: [policyStatement],
    });
  };
}

const actionDirectory: Record<string, string[]> = {
  get: ['geo-maps:GetStaticMap', 'geo-maps:GetTile'],
  autocomplete: ['geo-places:Autocomplete'],
  geocode: ['geo-places:Geocode', 'geo-places:ReverseGeocode'],
  search: [
    'geo-places:GetPlace',
    'geo-places:SearchNearby',
    'geo-places:SearchText',
    'geo-places:Suggest',
  ],
  create: ['geo:CreateGeofenceCollection'],
  read: [
    'geo:DescribeGeofenceCollection',
    'geo:BatchEvaluateGeofences',
    'geo:ForecastGeofenceEvents',
    'geo:GetGeofence',
  ],
  update: [
    'geo:BatchPutGeofence',
    'geo:PutGeofence',
    'geo:UpdateGeofenceCollection',
  ],
  delete: ['geo:BatchDeleteGeofence', 'geo:DeleteGeofenceCollection'],
  list: ['geo:ListGeofences', 'geo:ListGeofenceCollections'],
};
