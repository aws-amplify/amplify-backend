import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';

/**
 * Fetch a URL with retry logic to handle CloudFront propagation delays.
 * Polls until the expected conditions are met or timeout is reached.
 */
export const fetchWithRetry = async (
  url: string,
  options?: {
    maxRetries?: number;
    intervalMs?: number;
    expectedStatus?: number;
    expectedBodyContains?: string;
  },
): Promise<Response> => {
  const maxRetries = options?.maxRetries ?? 10;
  const intervalMs = options?.intervalMs ?? 30000;
  const expectedStatus = options?.expectedStatus ?? 200;
  const expectedBodyContains = options?.expectedBodyContains;

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      // If we only need status check and it matches, return immediately
      if (!expectedBodyContains && response.status === expectedStatus) {
        return response;
      }

      // If we need body check, clone response to read body without consuming it
      if (expectedBodyContains) {
        const cloned = response.clone();
        const body = await cloned.text();
        if (
          response.status === expectedStatus &&
          body.includes(expectedBodyContains)
        ) {
          return response;
        }
        process.stderr.write(
          `Attempt ${attempt}/${maxRetries}: status=${response.status}, body contains "${expectedBodyContains}": ${body.includes(expectedBodyContains)}\n`,
        );
        lastResponse = response;
      } else {
        process.stderr.write(
          `Attempt ${attempt}/${maxRetries}: status=${response.status}, expected=${expectedStatus}\n`,
        );
        lastResponse = response;
      }
    } catch (error) {
      process.stderr.write(
        `Attempt ${attempt}/${maxRetries}: fetch error: ${(error as Error).message}\n`,
      );
      lastError = error as Error;
    }

    if (attempt < maxRetries) {
      process.stderr.write(`Waiting ${intervalMs}ms before retry...\n`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error(
    `fetchWithRetry failed after ${maxRetries} attempts for ${url}: ${lastError?.message ?? 'unknown error'}`,
  );
};

/**
 * Retrieve the DistributionUrl CloudFormation output from the hosting nested stack.
 * Walks the root stack's nested stacks to find the one containing the DistributionUrl output.
 */
export const getDistributionUrlFromStack = async (
  cfnClient: CloudFormationClient,
  rootStackName: string,
): Promise<string> => {
  // First, check root stack outputs directly
  const rootDescribe = await cfnClient.send(
    new DescribeStacksCommand({ StackName: rootStackName }),
  );
  const rootOutputs = rootDescribe.Stacks?.[0]?.Outputs ?? [];
  for (const output of rootOutputs) {
    if (output.OutputKey?.includes('DistributionUrl') && output.OutputValue) {
      return output.OutputValue;
    }
  }

  // Walk nested stacks to find the DistributionUrl output
  const rootResources = await cfnClient.send(
    new ListStackResourcesCommand({ StackName: rootStackName }),
  );

  const nestedStackIds: string[] = [];
  for (const r of rootResources.StackResourceSummaries ?? []) {
    if (
      r.ResourceType === 'AWS::CloudFormation::Stack' &&
      r.PhysicalResourceId
    ) {
      nestedStackIds.push(r.PhysicalResourceId);
    }
  }

  for (const nestedStackId of nestedStackIds) {
    const nestedDescribe = await cfnClient.send(
      new DescribeStacksCommand({ StackName: nestedStackId }),
    );
    const nestedOutputs = nestedDescribe.Stacks?.[0]?.Outputs ?? [];
    for (const output of nestedOutputs) {
      if (output.OutputKey?.includes('DistributionUrl') && output.OutputValue) {
        return output.OutputValue;
      }
    }

    // Check second-level nested stacks (CDK sometimes nests deeper)
    const nestedResources = await cfnClient.send(
      new ListStackResourcesCommand({ StackName: nestedStackId }),
    );
    for (const r of nestedResources.StackResourceSummaries ?? []) {
      if (
        r.ResourceType === 'AWS::CloudFormation::Stack' &&
        r.PhysicalResourceId
      ) {
        const deepDescribe = await cfnClient.send(
          new DescribeStacksCommand({ StackName: r.PhysicalResourceId }),
        );
        const deepOutputs = deepDescribe.Stacks?.[0]?.Outputs ?? [];
        for (const output of deepOutputs) {
          if (
            output.OutputKey?.includes('DistributionUrl') &&
            output.OutputValue
          ) {
            return output.OutputValue;
          }
        }
      }
    }
  }

  throw new Error(
    `DistributionUrl output not found in stack ${rootStackName} or its nested stacks`,
  );
};
