import {
  CloudFormationClient,
  StackSummary,
} from '@aws-sdk/client-cloudformation';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  CloudWatchLogsClient,
  DeleteLogGroupCommand,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandOutput,
  LogGroup,
} from '@aws-sdk/client-cloudwatch-logs';
import { Bucket, ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
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
import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { CloudFrontDistributionCleaner } from './components/e2e-cleanup/cloudfront_distribution_cleaner.js';
import { CustomerProfilesDomainCleaner } from './components/e2e-cleanup/customer_profiles_domain_cleaner.js';
import { E2E_TEST_REGIONS } from './components/e2e-cleanup/e2e_test_regions.js';
import { S3BucketEmptier } from './components/e2e-cleanup/s3_bucket_emptier.js';
import {
  GuardedResourceType,
  StackDeleter,
} from './components/e2e-cleanup/stack_deleter.js';

const amplifyClient = new AmplifyClient({
  maxAttempts: 5,
});
const cfnClientConfig = {
  maxAttempts: 5,
  retryMode: 'adaptive',
};
const cfnClient = new CloudFormationClient(cfnClientConfig);
const cloudFrontClient = new CloudFrontClient({
  maxAttempts: 5,
});
const cloudWatchClient = new CloudWatchLogsClient({
  maxAttempts: 5,
});
const cognitoClient = new CognitoIdentityProviderClient({
  maxAttempts: 5,
});
const customerProfilesClient = new CustomerProfilesClient({
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
 * Name prefix of the Customer Profiles domains the attach mode notifications e2e tests create.
 * Deliberately distinct from the `amazon-connect-*` names the notifications construct generates,
 * so this sweep can never touch a domain that a construct or a customer owns.
 */
const TEST_PROFILES_DOMAIN_PREFIX = 'amplify-notif-ir-';

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

const createStackDeleter = (
  cloudFormationClient: CloudFormationClient,
): StackDeleter =>
  new StackDeleter(
    cloudFormationClient,
    TEST_AMPLIFY_RESOURCE_PREFIX,
    isStackStale,
  );

const stackDeleter = createStackDeleter(cfnClient);
const s3BucketEmptier = new S3BucketEmptier(s3Client);
const cloudFrontDistributionCleaner = new CloudFrontDistributionCleaner(
  cloudFrontClient,
  TEST_AMPLIFY_RESOURCE_PREFIX,
);
const customerProfilesDomainCleaner = new CustomerProfilesDomainCleaner(
  customerProfilesClient,
  TEST_PROFILES_DOMAIN_PREFIX,
  isStale,
);

/**
 * Deleting a resource that a stack still owns poisons the delete path of that stack, which is
 * how stacks end up stuck in DELETE_FAILED forever. Deleting the execution role of a custom
 * resource for example leaves CloudFormation waiting for a Lambda function that can no longer be
 * assumed. The ownership index must be captured before any deletion is requested, otherwise the
 * resources of the stacks that are being deleted look free while CloudFormation still uses them.
 */
const currentRegionLiveStackResources =
  await stackDeleter.getResourcesOwnedByLiveStacks();

/**
 * S3 buckets and IAM roles are listed account wide, so this run sees the ones of every region that
 * runs e2e tests, and the stacks of those regions have to be indexed as well. Without them a bucket
 * or a role of another region looks free and gets deleted while a live stack of that region is still
 * using it, which is exactly what poisons a stack delete path.
 *
 * Region scoped resource types are deliberately not checked against this index. Their names are
 * only unique within a region, so the equally named resource of another region would keep a
 * genuinely stale one from ever being cleaned up.
 */
const currentRegion = await cfnClient.config.region();
const allRegionLiveStackResources = (
  await Promise.all(
    E2E_TEST_REGIONS.filter((region) => region !== currentRegion).map(
      (region) =>
        createStackDeleter(
          new CloudFormationClient({ ...cfnClientConfig, region }),
        ).getResourcesOwnedByLiveStacks(),
    ),
  )
).reduce(
  (mergedIndex, regionIndex) => mergedIndex.merge(regionIndex),
  currentRegionLiveStackResources,
);

const ACCOUNT_WIDE_RESOURCE_TYPES: Array<GuardedResourceType> = [
  'AWS::IAM::Role',
  'AWS::S3::Bucket',
];

if (!allRegionLiveStackResources.isComplete) {
  console.warn(
    'Could not determine which resources still belong to stacks. Only stack deletion and the Amplify branch sweep will run, every other stale resource is left to a later run',
  );
}

let resourcesSkippedWithIncompleteIndex = 0;

const isOwnedByLiveStack = (
  resourceType: GuardedResourceType,
  physicalResourceId: string | undefined,
): boolean => {
  const liveStackResources = ACCOUNT_WIDE_RESOURCE_TYPES.includes(resourceType)
    ? allRegionLiveStackResources
    : currentRegionLiveStackResources;
  if (
    !liveStackResources.isOwnedByLiveStack(resourceType, physicalResourceId)
  ) {
    return false;
  }
  if (!liveStackResources.isComplete) {
    resourcesSkippedWithIncompleteIndex += 1;
    console.warn(
      `Skipping direct deletion of ${physicalResourceId} ${resourceType}. The stack ownership index is incomplete, so it cannot be told apart from a resource that a live stack still owns`,
    );
    return true;
  }
  console.log(
    `Skipping direct deletion of ${physicalResourceId} ${resourceType}. It belongs to a stack that has not finished deleting`,
  );
  return true;
};

const allStaleStacks = await stackDeleter.listStaleTopLevelStacks();

/**
 * A stack that is stuck in DELETE_FAILED because a bucket of one of its nested stacks is not empty
 * fails the same way on every retry until that bucket is emptied. The bucket is emptied but not
 * deleted, so that CloudFormation still owns the resource and its own delete of the bucket, and
 * therefore of the whole stack, is what succeeds on the retry below.
 */
const bucketsBlockingStackDeletion =
  await stackDeleter.findBucketsBlockingStackDeletion(allStaleStacks);

for (const bucketName of bucketsBlockingStackDeletion) {
  try {
    await s3BucketEmptier.empty(bucketName);
    console.log(
      `Successfully emptied ${bucketName} bucket that blocked a stack deletion`,
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '';
    console.log(
      `Failed to empty ${bucketName} bucket that blocked a stack deletion. ${errorMessage}`,
    );
  }
}

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
const bucketToDistributions =
  await cloudFrontDistributionCleaner.buildBucketToDistributionsIndex();

for (const staleBucket of staleBuckets) {
  if (staleBucket.Name) {
    const bucketName = staleBucket.Name;
    if (isOwnedByLiveStack('AWS::S3::Bucket', bucketName)) {
      continue;
    }
    try {
      /**
       * Deleting the origin bucket of a distribution that still exists leaves a distribution
       * that serves a bucket name anybody can claim, so the distributions go first. Disabling a
       * distribution takes tens of minutes to propagate, therefore the bucket is retained until
       * a subsequent run of this script is able to delete its distributions.
       */
      const distributionReapResult =
        await cloudFrontDistributionCleaner.reapDistributionsForBucket(
          bucketName,
          bucketToDistributions,
        );
      if (distributionReapResult === 'disable-requested') {
        console.log(
          `Retaining ${bucketName} bucket. A CloudFront distribution still uses it as an origin`,
        );
        continue;
      }
      await s3BucketEmptier.emptyAndDelete(bucketName);
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

/**
 * Customer Profiles domains are created by the attach mode notifications tests with the SDK, not
 * by CloudFormation, so no stack deletion ever reclaims one and the live stack ownership index
 * does not apply to them. A leaked domain is billable, therefore the prefix match in the cleaner
 * is what keeps this sweep safe rather than stack ownership.
 */
await customerProfilesDomainCleaner.deleteStaleTestDomains();

/**
 * An incomplete ownership index means the sweeps above fail closed and leave stale resources
 * behind. That is the safe outcome, but a silent one: the script would still exit 0, the workflow
 * would not retry, and a multi region cleanup outage could last for weeks unnoticed. Failing the
 * job surfaces it. The exit code is set instead of thrown so that everything above still runs.
 */
if (!allRegionLiveStackResources.isComplete) {
  console.warn(
    `Cleanup left ${resourcesSkippedWithIncompleteIndex} stale resources behind because the stack ownership index was incomplete. Failing the job so that the run is retried and the cause is visible`,
  );
  process.exitCode = 1;
}
