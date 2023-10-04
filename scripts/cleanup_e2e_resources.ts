import {
  CloudFormationClient,
  DeleteStackCommand,
  ListStacksCommand,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';
import {
  Bucket,
  DeleteBucketCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const cfnClient = new CloudFormationClient({
  maxAttempts: 5,
});
const s3Client = new S3Client({
  maxAttempts: 5,
});
const now = new Date();
const TEST_RESOURCE_PREFIX = 'amplify-test-sandbox';

const isStale = (creationDate: Date | undefined): boolean | undefined => {
  if (!creationDate) {
    return;
  }
  const staleDurationInMilliseconds = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  return now.getTime() - creationDate.getTime() > staleDurationInMilliseconds;
};

const listAllStaleTestStacks = async (): Array<StackSummary> => {
  let nextToken: string | undefined = undefined;
  const stackSummaries: Array<StackSummary> = [];
  do {
    const listStacksResponse = await cfnClient.send(
      new ListStacksCommand({
        NextToken: nextToken,
        StackStatusFilter: Object.keys(StackStatus).filter(
          (status) => status != StackStatus.DELETE_COMPLETE
        ),
      })
    );
    nextToken = listStacksResponse.NextToken;
    listStacksResponse.StackSummaries?.filter(
      (stackSummary) =>
        stackSummary.StackName?.startsWith(TEST_RESOURCE_PREFIX) &&
        isStale(stackSummary.CreationTime)
    ).forEach((item) => {
      stackSummaries.push(item);
    });
  } while (nextToken);
  return stackSummaries;
};

const allStaleStacks = await listAllStaleTestStacks();

for (const staleStack of allStaleStacks) {
  if (staleStack.StackName) {
    const stackName = staleStack.StackName;
    try {
      await cfnClient.send(new DeleteStackCommand({ StackName: stackName }));
      console.log(`Successfully kicked off ${stackName} stack deletion`);
    } catch (e: Error) {
      console.log(
        `Failed to kick off ${stackName} stack deletion. ${e.message as string}`
      );
    }
  }
}

const listStaleS3Buckets = async (): Array<Bucket> => {
  const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
  return (
    listBucketsResponse.Buckets?.filter(
      (bucket) =>
        isStale(bucket.CreationDate) &&
        bucket.Name.startsWith(TEST_RESOURCE_PREFIX)
    ) ?? []
  );
};

const staleBuckets = await listStaleS3Buckets();

for (const staleBucket of staleBuckets) {
  if (staleBucket.Name) {
    const bucketName = staleBucket.Name;
    try {
      await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
      console.log(`Successfully deleted ${bucketName} bucket`);
    } catch (e: Error) {
      console.log(
        `Failed to delete ${bucketName} bucket. ${e.message as string}`
      );
    }
  }
}
