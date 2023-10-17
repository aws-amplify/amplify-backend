import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  ListStackResourcesCommand,
  StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import {
  BackendDeploymentStatus,
  DeployedBackendResource,
} from '../deployed_backend_client_factory.js';
import { ListDeployedResources } from './list_deployed_resources.js';

void describe('listDeployedResources', () => {
  const listDeployedResources = new ListDeployedResources();
  const cfnClientSendMock = mock.fn();
  const mockCfnClient = new CloudFormation();

  beforeEach(() => {
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
  });

  void it('Recursively fetches resources for all stacks', async () => {
    const mockRootStackResources: StackResourceSummary[] = [
      {
        ResourceType: 'AWS::CloudFormation::Stack',
        PhysicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/apiStack/{additionalFields}',
        LogicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/apiStack/{additionalFields}',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
      {
        ResourceType: 'AWS::CloudFormation::Stack',
        PhysicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/authStack/{additionalFields}',
        LogicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/authStack/{additionalFields}',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
      {
        ResourceType: 'AWS::IAM::Role',
        PhysicalResourceId: 'rootStackIamRolePhysicalResourceId',
        LogicalResourceId: 'rootStackIamRoleLogicalResourceId',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
    ];

    const mockAuthStackResources: StackResourceSummary[] = [
      {
        ResourceType: 'AWS::Cognito::UserPool',
        PhysicalResourceId: 'authStackUserPoolPhysicalResourceId',
        LogicalResourceId: 'authStackUserPoolLogicalResourceId',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
    ];

    const mockApiStackResources: StackResourceSummary[] = [
      {
        ResourceType: 'AWS::CloudFormation::Stack',
        PhysicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/apiStackSubStack/{additionalFields}',
        LogicalResourceId:
          'arn:aws:{service}:{region}:{account}:stack/apiStackSubStack/{additionalFields}',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
      {
        ResourceType: 'AWS::Cognito::UserPool',
        PhysicalResourceId: 'apiStackUserPoolPhysicalResourceId',
        LogicalResourceId: 'apiStackUserPoolLogicalResourceId',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
    ];

    const mockApiSubStackResources: StackResourceSummary[] = [
      {
        ResourceType: 'AWS::AppSync::API',
        PhysicalResourceId: 'apiSubStackAppSyncPhysicalResourceId',
        LogicalResourceId: 'apiSubStackAppSyncLogicalResourceId',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceStatusReason: undefined,
        LastUpdatedTimestamp: new Date(1),
      },
    ];

    cfnClientSendMock.mock.mockImplementation(
      (listStackResourcesCommand: ListStackResourcesCommand) => {
        switch (listStackResourcesCommand.input.StackName) {
          case 'testRootStack':
            return { StackResourceSummaries: mockRootStackResources };
          case 'authStack':
            return { StackResourceSummaries: mockAuthStackResources };
          case 'apiStack':
            return { StackResourceSummaries: mockApiStackResources };
          case 'apiStackSubStack':
            return { StackResourceSummaries: mockApiSubStackResources };
          default:
            throw new Error(
              `Unknown stack name ${
                listStackResourcesCommand.input.StackName as string
              }`
            );
        }
      }
    );
    const deployedResources = await listDeployedResources.listDeployedResources(
      mockCfnClient,
      'testRootStack'
    );

    const expectedResources: DeployedBackendResource[] = [
      {
        logicalResourceId: 'apiSubStackAppSyncLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::AppSync::API',
        physicalResourceId: 'apiSubStackAppSyncPhysicalResourceId',
      },
      {
        logicalResourceId: 'apiStackUserPoolLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::Cognito::UserPool',
        physicalResourceId: 'apiStackUserPoolPhysicalResourceId',
      },
      {
        logicalResourceId: 'authStackUserPoolLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::Cognito::UserPool',
        physicalResourceId: 'authStackUserPoolPhysicalResourceId',
      },
      {
        logicalResourceId: 'rootStackIamRoleLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::IAM::Role',
        physicalResourceId: 'rootStackIamRolePhysicalResourceId',
      },
    ];
    assert.deepEqual(deployedResources, expectedResources);
  });
});
