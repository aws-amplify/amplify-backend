import {
  CloudFormationClient,
  DeleteStackCommand,
  ListStacksCommand,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';

const cfnClient = new CloudFormationClient({
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
