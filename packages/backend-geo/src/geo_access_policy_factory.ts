import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { GeoAction } from './types.js';
import { AmplifyFault } from '@aws-amplify/platform-core';

/**
 * Geo Access Policy Factory
 *
 * Responsible for policy statement generation and policy-role attachment.
 */
export class GeoAccessPolicyFactory {
  //  creating a singular IAM policy
  createPolicyStatement = (
    permissions: GeoAction[], // organize create policy such that one resource type maps to the actions
    resourceArn: string,
  ): PolicyStatement => {
    if (permissions.length === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }

    // policy statements created for each resource type?
    const policyStatement: PolicyStatement = new PolicyStatement();

    permissions.forEach((action) => {
      policyStatement.addActions(...actionDirectory[action]);
    });

    policyStatement.addResources(resourceArn);

    return policyStatement; // returns policy statement with all policies
  };

  attachPolicy = (userRole: IRole, statement: PolicyStatement) =>
    userRole.addToPrincipalPolicy(statement);
}

const actionDirectory: Record<GeoAction, string[]> = {
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
