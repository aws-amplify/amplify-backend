import {
  CloudFormationClient,
  StackSummary,
} from '@aws-sdk/client-cloudformation';
import {
  CloudWatchLogsClient,
  DeleteLogGroupCommand,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandOutput,
  LogGroup,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  Bucket,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListBucketsCommand,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectIdentifier,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CognitoIdentityProviderClient,
  DeleteUserPoolCommand,
  DeleteUserPoolDomainCommand,
  DescribeUserPoolCommand,
  ListUserPoolsCommand,
  ListUserPoolsCommandOutput,
  UserPoolDescriptionType,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  AmplifyClient,
  App,
  Branch,
  DeleteBranchCommand,
  ListAppsCommand,
  ListAppsCommandOutput,
  ListBranchesCommand,
  ListBranchesCommandOutput,
} from '@aws-sdk/client-amplify';
import {
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
  DetachRolePolicyCommand,
  IAMClient,
  ListAttachedRolePoliciesCommand,
  ListAttachedRolePoliciesCommandOutput,
  ListRolePoliciesCommand,
  ListRolePoliciesCommandOutput,
  ListRolesCommand,
  ListRolesCommandOutput,
  Role,
} from '@aws-sdk/client-iam';
import {
  DeleteParameterCommand,
  DescribeParametersCommand,
  DescribeParametersCommandOutput,
  ParameterMetadata,
  SSMClient,
} from '@aws-sdk/client-ssm';
import {
  DeleteTableCommand,
  DescribeTableCommand,
  DescribeTableCommandOutput,
  DynamoDBClient,
  ListTablesCommand,
  ListTablesCommandOutput,
  TableDescription,
} from '@aws-sdk/client-dynamodb';
import { StackDeleter } from './components/e2e-cleanup/stack_deleter.js';

const amplifyClient = new AmplifyClient({
  maxAttempts: 5,
});
const cfnClient = new CloudFormationClient({
  maxAttempts: 5,
});
const cloudWatchClient = new CloudWatchLogsClient({
  maxAttempts: 5,
});
const cognitoClient = new CognitoIdentityProviderClient({
  maxAttempts: 5,
});
const ddbClient = new DynamoDBClient({
  maxAttempts: 5,
});
const iamClient = new IAMClient({
  maxAttempts: 5,
});
const s3Client = new S3Client({
  maxAttempts: 5,
});
const ssmClient = new SSMClient({
  maxAttempts: 5,
});
const now = new Date();
const TEST_AMPLIFY_RESOURCE_PREFIX = 'amplify-';
const TEST_CDK_RESOURCE_PREFIX = 'test-cdk';

/**
 * Stacks are considered stale after 2 hours.
 * Log groups are considered stale after 7 days. For troubleshooting purposes.
 * Other resources are considered stale after 3 hours.
 *
 * Stack deletion triggers asynchronous resource deletion while this script is running.
 * In order to not interfere with normal stack deletion process we defer
 * direct deletions by additional hour, so that it covers cases where
 * stack deletion failed or left orphan resources.
 */
const stackStaleDurationInMilliseconds = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const staleDurationInMilliseconds = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const logGroupStaleDurationInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const isStackStale = (
  stackSummary: StackSummary | undefined,
): boolean | undefined => {
  if (!stackSummary?.CreationTime) {
    return;
  }
  return (
    now.getTime() - stackSummary.CreationTime.getTime() >
    stackStaleDurationInMilliseconds
  );
};

const isLogGroupStale = (
  logGroup: LogGroup | undefined,
): boolean | undefined => {
  if (!logGroup?.creationTime) {
    return;
  }
  return (
    now.getTime() - logGroup.creationTime > logGroupStaleDurationInMilliseconds
  );
};

const isStale = (creationDate: Date | undefined): boolean | undefined => {
  if (!creationDate) {
    return;
  }
  return now.getTime() - creationDate.getTime() > staleDurationInMilliseconds;
};

const stackDeleter = new StackDeleter(
  cfnClient,
  TEST_AMPLIFY_RESOURCE_PREFIX,
  isStackStale,
);

/**
 * Deleting a resource that a stack still owns poisons the delete path of that stack, which is
 * how stacks end up stuck in DELETE_FAILED forever. Deleting the execution role of a custom
 * resource for example leaves CloudFormation waiting for a Lambda function that can no longer be
 * assumed. The ownership index must be captured before any deletion is requested, otherwise the
 * resources of the stacks that are being deleted look free while CloudFormation still uses them.
 */
const liveStackResources = await stackDeleter.getResourcesOwnedByLiveStacks();
if (!liveStackResources.isComplete) {
  console.log(
    'Could not determine which resources still belong to stacks. Only stack deletion will run',
  );
}

const isOwnedByLiveStack = (
  resourceType: string,
  physicalResourceId: string | undefined,
): boolean => {
  if (
    !liveStackResources.isOwnedByLiveStack(resourceType, physicalResourceId)
  ) {
    return false;
  }
  console.log(
    `Skipping direct deletion of ${physicalResourceId} ${resourceType}. It belongs to a stack that has not finished deleting`,
  );
  return true;
};

const allStaleStacks = await stackDeleter.listStaleTopLevelStacks();

for (const staleStack of allStaleStacks) {
  try {
    await stackDeleter.deleteStack(staleStack);
    console.log(
      `Successfully kicked off ${staleStack.StackName} stack deletion`,
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to kick off ${staleStack.StackName} stack deletion. ${errorMessage}`,
    );
  }
}

const listStaleS3Buckets = async (): Promise<Array<Bucket>> => {
  const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
  return (
    listBucketsResponse.Buckets?.filter(
      (bucket) =>
        isStale(bucket.CreationDate) &&
        bucket.Name?.startsWith(TEST_AMPLIFY_RESOURCE_PREFIX),
    ) ?? []
  );
};

const staleBuckets = await listStaleS3Buckets();

const emptyAndDeleteS3Bucket = async (bucketName: string): Promise<void> => {
  let nextToken: string | undefined = undefined;
  do {
    const listObjectsResponse: ListObjectsV2CommandOutput = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: nextToken,
      }),
    );
    const objectsToDelete: ObjectIdentifier[] | undefined =
      listObjectsResponse.Contents?.map(
        (s3Object) => s3Object as ObjectIdentifier,
      );
    if (objectsToDelete && objectsToDelete.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
          },
        }),
      );
    }
    nextToken = listObjectsResponse.NextContinuationToken;
  } while (nextToken);

  do {
    const listVersionsResponse = await s3Client.send(
      new ListObjectVersionsCommand({
        Bucket: bucketName,
        KeyMarker: nextToken,
      }),
    );
    const objectsToDelete = ([] as ObjectIdentifier[])
      .concat(
        listVersionsResponse.DeleteMarkers?.map(
          (s3Object) => s3Object as ObjectIdentifier,
        ) ?? [],
      )
      .concat(
        listVersionsResponse.Versions?.map(
          (s3Object) => s3Object as ObjectIdentifier,
        ) ?? [],
      );
    if (objectsToDelete.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
          },
        }),
      );
    }
    nextToken = listVersionsResponse.NextKeyMarker;
  } while (nextToken);

  await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
};

for (const staleBucket of staleBuckets) {
  if (staleBucket.Name) {
    const bucketName = staleBucket.Name;
    if (isOwnedByLiveStack('AWS::S3::Bucket', bucketName)) {
      continue;
    }
    try {
      await emptyAndDeleteS3Bucket(bucketName);
      console.log(`Successfully deleted ${bucketName} bucket`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '';
      console.log(`Failed to delete ${bucketName} bucket. ${errorMessage}`);
    }
  }
}

const listStaleCognitoUserPools = async () => {
  let nextToken: string | undefined = undefined;
  const userPools: Array<UserPoolDescriptionType> = [];
  do {
    const listUserPoolsResponse: ListUserPoolsCommandOutput =
      await cognitoClient.send(
        new ListUserPoolsCommand({
          NextToken: nextToken,
          MaxResults: 60,
        }),
      );
    nextToken = listUserPoolsResponse.NextToken;
    listUserPoolsResponse.UserPools?.filter((userPool) =>
      isStale(userPool.CreationDate),
    ).forEach((item) => {
      userPools.push(item);
    });
  } while (nextToken);
  return userPools;
};

const staleUserPools = await listStaleCognitoUserPools();

for (const staleUserPool of staleUserPools) {
  if (staleUserPool.Name) {
    if (isOwnedByLiveStack('AWS::Cognito::UserPool', staleUserPool.Id)) {
      continue;
    }
    try {
      const describeUserPoolResponse = await cognitoClient.send(
        new DescribeUserPoolCommand({
          UserPoolId: staleUserPool.Id,
        }),
      );
      if (describeUserPoolResponse.UserPool?.Domain) {
        await cognitoClient.send(
          new DeleteUserPoolDomainCommand({
            UserPoolId: describeUserPoolResponse.UserPool.Id,
            Domain: describeUserPoolResponse.UserPool?.Domain,
          }),
        );
      }
      await cognitoClient.send(
        new DeleteUserPoolCommand({
          UserPoolId: staleUserPool.Id,
        }),
      );
      console.log(`Successfully deleted ${staleUserPool.Name} user pool`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '';
      console.log(
        `Failed to delete ${staleUserPool.Name} user pool. ${errorMessage}`,
      );
    }
  }
}

const listAllTestAmplifyApps = async (): Promise<Array<App>> => {
  let nextToken: string | undefined = undefined;
  const apps: Array<App> = [];
  do {
    const listAppsCommandOutput: ListAppsCommandOutput =
      await amplifyClient.send(
        new ListAppsCommand({
          maxResults: 100,
          nextToken,
        }),
      );
    nextToken = listAppsCommandOutput.nextToken;
    listAppsCommandOutput.apps
      ?.filter((app: App) => app.name?.startsWith(TEST_AMPLIFY_RESOURCE_PREFIX))
      .forEach((app: App) => {
        apps.push(app);
      });
  } while (nextToken);
  return apps;
};

const listStaleAmplifyAppBranches = async (
  appId: string,
): Promise<Array<Branch>> => {
  let nextToken: string | undefined = undefined;
  const branches: Array<Branch> = [];
  do {
    const listBranchesCommandOutput: ListBranchesCommandOutput =
      await amplifyClient.send(
        new ListBranchesCommand({
          appId,
          maxResults: 50,
          nextToken,
        }),
      );
    nextToken = listBranchesCommandOutput.nextToken;
    if (listBranchesCommandOutput.branches) {
      listBranchesCommandOutput.branches
        .filter((branch: Branch) => isStale(branch.createTime))
        .forEach((branch: Branch) => {
          branches.push(branch);
        });
    }
  } while (nextToken);
  return branches;
};

const listAllStaleAmplifyAppBranches = async (): Promise<
  Array<{
    appId: string;
    branchName: string;
  }>
> => {
  const branches: Array<{
    appId: string;
    branchName: string;
  }> = [];
  const allTestApps = await listAllTestAmplifyApps();
  for (const testApp of allTestApps) {
    if (testApp.appId) {
      const staleAppBranches = await listStaleAmplifyAppBranches(testApp.appId);
      staleAppBranches.forEach((branch) => {
        if (testApp.appId && branch.branchName) {
          branches.push({
            appId: testApp.appId,
            branchName: branch.branchName,
          });
        }
      });
    }
  }
  return branches;
};

const allStaleBranches = await listAllStaleAmplifyAppBranches();
for (const staleBranch of allStaleBranches) {
  try {
    await amplifyClient.send(
      new DeleteBranchCommand({
        appId: staleBranch.appId,
        branchName: staleBranch.branchName,
      }),
    );
    console.log(
      `Successfully deleted ${staleBranch.branchName} branch of app ${staleBranch.appId}`,
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to delete ${staleBranch.branchName} branch of app ${staleBranch.appId}. ${errorMessage}`,
    );
  }
}

const listAllStaleRoles = async (): Promise<Array<Role>> => {
  let nextToken: string | undefined = undefined;
  const roles: Array<Role> = [];
  do {
    const listRolesCommandOutput: ListRolesCommandOutput = await iamClient.send(
      new ListRolesCommand({
        Marker: nextToken,
      }),
    );
    nextToken = listRolesCommandOutput.Marker;
    if (listRolesCommandOutput.Roles) {
      listRolesCommandOutput.Roles.filter(
        (role: Role) =>
          (role.RoleName?.startsWith(TEST_AMPLIFY_RESOURCE_PREFIX) ||
            role.RoleName?.startsWith(TEST_CDK_RESOURCE_PREFIX)) &&
          isStale(role.CreateDate),
      ).forEach((role: Role) => {
        roles.push(role);
      });
    }
  } while (nextToken);
  return roles;
};

const allStaleRoles = await listAllStaleRoles();
for (const staleRole of allStaleRoles) {
  if (isOwnedByLiveStack('AWS::IAM::Role', staleRole.RoleName)) {
    continue;
  }
  try {
    // delete inline policies
    const inlinePolicies: ListRolePoliciesCommandOutput = await iamClient.send(
      new ListRolePoliciesCommand({ RoleName: staleRole.RoleName }),
    );
    for (const policyName of inlinePolicies.PolicyNames || []) {
      await iamClient.send(
        new DeleteRolePolicyCommand({
          RoleName: staleRole.RoleName,
          PolicyName: policyName,
        }),
      );
    }
    // detach policies
    const attachedPolicies: ListAttachedRolePoliciesCommandOutput =
      await iamClient.send(
        new ListAttachedRolePoliciesCommand({ RoleName: staleRole.RoleName }),
      );
    for (const policy of attachedPolicies.AttachedPolicies || []) {
      await iamClient.send(
        new DetachRolePolicyCommand({
          RoleName: staleRole.RoleName,
          PolicyArn: policy.PolicyArn,
        }),
      );
    }
    // delete role
    await iamClient.send(
      new DeleteRoleCommand({ RoleName: staleRole.RoleName }),
    );
    console.log(`Successfully deleted ${staleRole.RoleName} IAM Role`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to delete ${staleRole.RoleName} IAM Role. ${errorMessage}`,
    );
  }
}

const listAllStaleSSMParameters = async (): Promise<
  Array<ParameterMetadata>
> => {
  let nextToken: string | undefined = undefined;
  const parameters: Array<ParameterMetadata> = [];
  do {
    const describeParametersCommandOutput: DescribeParametersCommandOutput =
      await ssmClient.send(
        new DescribeParametersCommand({
          NextToken: nextToken,
          MaxResults: 50,
          ParameterFilters: [
            {
              Key: 'Name',
              Option: 'BeginsWith',
              Values: ['/amplify/'],
            },
          ],
        }),
      );
    nextToken = describeParametersCommandOutput.NextToken;
    if (describeParametersCommandOutput.Parameters) {
      describeParametersCommandOutput.Parameters.filter(
        (parameter: ParameterMetadata) => isStale(parameter.LastModifiedDate),
      ).forEach((parameter: ParameterMetadata) => {
        parameters.push(parameter);
      });
    }
  } while (nextToken);
  return parameters;
};

const allStaleSSMParameters = await listAllStaleSSMParameters();
for (const staleSSMParameter of allStaleSSMParameters) {
  if (isOwnedByLiveStack('AWS::SSM::Parameter', staleSSMParameter.Name)) {
    continue;
  }
  try {
    await ssmClient.send(
      new DeleteParameterCommand({
        Name: staleSSMParameter.Name,
      }),
    );
    console.log(`Successfully deleted ${staleSSMParameter.Name} SSM parameter`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to delete ${staleSSMParameter.Name} SSM parameter. ${errorMessage}`,
    );
  }
}

const listAllStaleDynamoDBTables = async (): Promise<
  Array<TableDescription>
> => {
  let nextToken: string | undefined = undefined;
  const tableNames: Array<string> = [];
  do {
    const listTablesCommandOutput: ListTablesCommandOutput =
      await ddbClient.send(
        new ListTablesCommand({
          ExclusiveStartTableName: nextToken,
        }),
      );
    nextToken = listTablesCommandOutput.LastEvaluatedTableName;
    if (listTablesCommandOutput.TableNames) {
      tableNames.push(...listTablesCommandOutput.TableNames);
    }
  } while (nextToken);
  const tables: Array<TableDescription> = [];
  for (const tableName of tableNames) {
    const describeTableCommandOutput: DescribeTableCommandOutput =
      await ddbClient.send(
        new DescribeTableCommand({
          TableName: tableName,
        }),
      );
    if (describeTableCommandOutput.Table) {
      tables.push(describeTableCommandOutput.Table);
    }
  }
  return tables.filter((table) => isStale(table.CreationDateTime));
};

const allStaleDynamoDBTables = await listAllStaleDynamoDBTables();
for (const staleDynamoDBTable of allStaleDynamoDBTables) {
  if (
    isOwnedByLiveStack('AWS::DynamoDB::Table', staleDynamoDBTable.TableName)
  ) {
    continue;
  }
  try {
    await ddbClient.send(
      new DeleteTableCommand({
        TableName: staleDynamoDBTable.TableName,
      }),
    );
    console.log(
      `Successfully deleted ${staleDynamoDBTable.TableName} DDB table`,
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to delete ${staleDynamoDBTable.TableName} DDB table. ${errorMessage}`,
    );
  }
}

const listAllStaleTestLogGroups = async (): Promise<Array<LogGroup>> => {
  let nextToken: string | undefined = undefined;
  const logGroups: Array<LogGroup> = [];
  do {
    const listLogGroupsResponse: DescribeLogGroupsCommandOutput =
      await cloudWatchClient.send(
        new DescribeLogGroupsCommand({
          nextToken,
        }),
      );
    nextToken = listLogGroupsResponse.nextToken;
    listLogGroupsResponse.logGroups
      ?.filter(
        (logGroup) =>
          (logGroup.logGroupName?.startsWith(TEST_AMPLIFY_RESOURCE_PREFIX) ||
            logGroup.logGroupName?.startsWith(
              `/aws/lambda/${TEST_AMPLIFY_RESOURCE_PREFIX}`,
            )) &&
          isLogGroupStale(logGroup),
      )
      .forEach((item) => {
        logGroups.push(item);
      });
  } while (nextToken);
  return logGroups;
};

const allStaleLogGroups = await listAllStaleTestLogGroups();
for (const logGroup of allStaleLogGroups) {
  if (isOwnedByLiveStack('AWS::Logs::LogGroup', logGroup.logGroupName)) {
    continue;
  }
  try {
    await cloudWatchClient.send(
      new DeleteLogGroupCommand({
        logGroupName: logGroup.logGroupName,
      }),
    );
    console.log(`Successfully deleted ${logGroup.logGroupName} log group`);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to delete ${logGroup.logGroupName} log group. ${errorMessage}`,
    );
  }
}
