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
import { DeployedResourcesEnumerator } from './deployed_resources_enumerator.js';
import { StackStatusMapper } from './stack_status_mapper.js';
import { ArnGenerator } from './arn_generator.js';

void describe('listDeployedResources', () => {
  const arnGeneratorMock = new ArnGenerator();
  mock.method(arnGeneratorMock, 'generateArn', () => undefined);
  const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
    new StackStatusMapper(),
    arnGeneratorMock
  );
  const cfnClientSendMock = mock.fn();
  const mockCfnClient = new CloudFormation();

  beforeEach(() => {
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
  });

  void it('Recursively fetches resources for all stacks', async () => {
    const mockRootStackResourcesPage1: StackResourceSummary[] = [
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
    ];

    const mockRootStackResourcesPage2: StackResourceSummary[] = [
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
          case 'testRootStack': {
            if (listStackResourcesCommand.input.NextToken) {
              return { StackResourceSummaries: mockRootStackResourcesPage2 };
            }

            return {
              StackResourceSummaries: mockRootStackResourcesPage1,
              NextToken: 1,
            };
          }
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
    const deployedResources =
      await deployedResourcesEnumerator.listDeployedResources(
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
        arn: undefined,
      },
      {
        logicalResourceId: 'apiStackUserPoolLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::Cognito::UserPool',
        physicalResourceId: 'apiStackUserPoolPhysicalResourceId',
        arn: undefined,
      },
      {
        logicalResourceId: 'authStackUserPoolLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::Cognito::UserPool',
        physicalResourceId: 'authStackUserPoolPhysicalResourceId',
        arn: undefined,
      },
      {
        logicalResourceId: 'rootStackIamRoleLogicalResourceId',
        lastUpdated: new Date(1),
        resourceStatus: BackendDeploymentStatus.DEPLOYED,
        resourceStatusReason: undefined,
        resourceType: 'AWS::IAM::Role',
        physicalResourceId: 'rootStackIamRolePhysicalResourceId',
        arn: undefined,
      },
    ];
    assert.deepEqual(deployedResources, expectedResources);
  });
});
