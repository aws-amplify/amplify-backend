import {
  CloudFormationClient,
  DeleteStackCommand,
  ListStacksCommand,
  StackSummary,
} from '@aws-sdk/client-cloudformation';

const cfnClient = new CloudFormationClient({
  maxAttempts: 5,
});
const now = new Date();

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
      new ListStacksCommand({ NextToken: nextToken })
    );
    nextToken = listStacksResponse.NextToken;
    listStacksResponse.StackSummaries?.filter(
      (stackSummary) =>
        stackSummary.StackName?.startsWith('amplify-test-sandbox') &&
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
      console.log(`Successfully deleted ${stackName} stack`);
    } catch (e: Error) {
      console.log(
        `Failed to delete ${stackName} stack. ${e.message as string}`
      );
    }
  }
}
