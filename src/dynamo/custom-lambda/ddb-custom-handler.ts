import { DynamoDB } from "aws-sdk";
import type { CloudFormationCustomResourceEvent } from "aws-lambda";
import type {
  KeySchema,
  Projection,
  TableDescription,
  UpdateTableInput,
} from "aws-sdk/clients/dynamodb";
import type { DDBConfig } from "../ddb-custom-config-type";

const ddbClient = new DynamoDB();

const log = (msg: string, ...other: any[]) => {
  console.log(
    msg,
    other.map((o) =>
      typeof o === "object" ? JSON.stringify(o, undefined, 2) : o
    )
  );
};

export const onEvent = async (
  event: CloudFormationCustomResourceEvent
): Promise<AWSCDKAsyncCustomResource.OnEventResponse | void> => {
  log("got event", event);
  const internalEventProps = {
    ...event.ResourceProperties,
  } as unknown as DDBConfig & { ServiceToken?: string };
  delete internalEventProps.ServiceToken;
  switch (event.RequestType) {
    case "Create":
      log("initiating create");
      await ddbClient.createTable(internalEventProps).promise();
      const result = { PhysicalResourceId: event.ResourceProperties.TableName };
      log("returning result", result);
      return result;
    case "Update":
      log("fetching current table state");
      const describeTableResult = await ddbClient
        .describeTable({ TableName: event.PhysicalResourceId })
        .promise();
      if (!describeTableResult.Table) {
        throw new Error(`Could not find ${event.PhysicalResourceId} to update`);
      }
      const nextUpdate = getNextUpdate(
        describeTableResult.Table,
        internalEventProps
      );
      log("computed next update", nextUpdate);
      if (!nextUpdate) return; // nothin to update
      log("initiating table update");
      await ddbClient.updateTable(nextUpdate).promise();
    case "Delete":
      log("initiating table deletion");
      try {
        await ddbClient
          .deleteTable({ TableName: event.PhysicalResourceId })
          .promise();
      } catch (err) {
        // TODO only swallow NotExist errors
      }
  }
  // after this function exits, the state machine will invoke isComplete in a loop until it returns finished or the state machine times out
};

export const isComplete = async (
  event: AWSCDKAsyncCustomResource.IsCompleteRequest
): Promise<AWSCDKAsyncCustomResource.IsCompleteResponse> => {
  log("got event", event);
  if (event.RequestType === "Delete") {
    // nothing else to do on delete
    log("delete is finished");
    return finished;
  }
  if (!event.PhysicalResourceId) {
    throw new Error("PhysicalResourceId not set in call to isComplete");
  }
  log("fetching current table state");
  const describeTableResult = await retry(
    async () =>
      await ddbClient
        .describeTable({ TableName: event.PhysicalResourceId! })
        .promise(),
    (result) => !!result?.Table
  );
  if (describeTableResult.Table?.TableStatus !== "ACTIVE") {
    log("table not active yet");
    return notFinished;
  }
  // table is active, need to check GSI status
  if (
    describeTableResult.Table.GlobalSecondaryIndexes?.some(
      (gsi) => gsi.IndexStatus !== "ACTIVE" || gsi.Backfilling
    )
  ) {
    log("some GSI is not active yet");
    return notFinished;
  }

  if (event.RequestType === "Create") {
    // no additional updates required on create
    log("create is finished");
    return finished;
  }

  // need to check if any more GSI updates are necessary
  const nextUpdate = getNextUpdate(
    describeTableResult.Table,
    event.ResourceProperties as unknown as DDBConfig
  );
  log("computed next update", nextUpdate);
  if (!nextUpdate) {
    // current state equals end state so we're done
    return finished;
  }
  log("initiating table update");
  await ddbClient.updateTable(nextUpdate).promise();
  return notFinished;
  // a response of notFinished in this function will cause the function to be invoked again by the state machine after some time
};

const finished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: true,
};
const notFinished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: false,
};

// compares the currentState with the endState to determine a next update step that will get the table closer to the end state
export const getNextUpdate = (
  currentState: TableDescription,
  endState: DDBConfig
): UpdateTableInput | undefined => {
  const endStateGSIs = endState.GlobalSecondaryIndexes || [];
  const endStateGSINames = endStateGSIs.map((gsi) => gsi.IndexName);

  const currentStateGSIs = currentState.GlobalSecondaryIndexes || [];
  const currentStateGSINames = currentStateGSIs.map((gsi) => gsi.IndexName);

  // function to identify any GSIs that need to be removed
  const gsiRequiresReplacementPredicate = (
    currentGSI: DynamoDB.GlobalSecondaryIndexDescription
  ): boolean => {
    // check if the index has been removed entirely
    if (!endStateGSINames.includes(currentGSI.IndexName!)) return true;
    // get the end state of this GSI
    const respectiveEndStateGSI = endStateGSIs.find(
      (endStateGSI) => endStateGSI.IndexName === currentGSI.IndexName
    )!;
    // detect if projection has changed
    if (
      isProjectionModified(
        currentGSI.Projection!,
        respectiveEndStateGSI.Projection!
      )
    )
      return true;
    // detect if key schema has changed
    if (
      isKeySchemaModified(
        currentGSI.KeySchema!,
        respectiveEndStateGSI.KeySchema!
      )
    )
      return true;
    // if we got here, then the GSI does not need to be removed
    return false;
  };
  const gsiToRemove = currentStateGSIs.find(gsiRequiresReplacementPredicate);
  if (gsiToRemove) {
    return {
      TableName: currentState.TableName!,
      GlobalSecondaryIndexUpdates: [
        {
          Delete: {
            IndexName: gsiToRemove.IndexName!,
          },
        },
      ],
    };
  }

  // if we get here, then find a GSI that needs to be created and construct an update request
  const gsiRequiresCreationPredicate = (
    endStateGSI: DynamoDB.GlobalSecondaryIndex
  ): boolean => !currentStateGSINames.includes(endStateGSI.IndexName);

  const gsiToAdd = endStateGSIs.find(gsiRequiresCreationPredicate);
  if (gsiToAdd) {
    const attributeNamesToInclude = gsiToAdd.KeySchema.map(
      (schema) => schema.AttributeName
    );
    return {
      TableName: currentState.TableName!,
      AttributeDefinitions: endState.AttributeDefinitions.filter((def) =>
        attributeNamesToInclude.includes(def.AttributeName)
      ),
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: gsiToAdd.IndexName,
            KeySchema: gsiToAdd.KeySchema,
            Projection: gsiToAdd.Projection,
          },
        },
      ],
    };
  }

  // no more updates necessary
  return undefined;
};

const isProjectionModified = (
  currentProjection: Projection,
  endProjection: Projection
): boolean => {
  // first see if the projection type is changed
  if (currentProjection.ProjectionType !== endProjection.ProjectionType)
    return true;

  // if projection type is all for both then no need to check projection attributes
  if (currentProjection.ProjectionType === "ALL") return false;

  const currentNonKeyAttributes = currentProjection.NonKeyAttributes || [];
  const endNonKeyAttributes = currentProjection.NonKeyAttributes || [];
  // if an attribute has been added or removed
  if (currentNonKeyAttributes.length !== endNonKeyAttributes.length)
    return true;

  // if an attribute has been swapped
  if (
    currentNonKeyAttributes.some(
      (currentNonKeyAttribute) =>
        !endNonKeyAttributes.includes(currentNonKeyAttribute)
    )
  )
    return true;

  // nothing is different
  return false;
};

const isKeySchemaModified = (
  currentSchema: KeySchema,
  endSchema: KeySchema
): boolean => {
  const currentHashKey = currentSchema.find(
    (schema) => schema.KeyType === "HASH"
  );
  const endHashKey = endSchema.find((schema) => schema.KeyType === "HASH");
  // check if hash key attribute name is modified
  if (currentHashKey?.AttributeName !== endHashKey?.AttributeName) return true;

  const currentSortKey = currentSchema.find(
    (schema) => schema.KeyType === "RANGE"
  );
  const endSortKey = endSchema.find((schema) => schema.KeyType === "RANGE");

  // if a sort key doesn't exist in current or end state, then we're done, the schemas are the same
  if (currentSortKey === undefined && endSortKey === undefined) return false;

  // check if sort key removed or added
  if (
    (currentSortKey === undefined && endSortKey !== undefined) ||
    (currentSortKey !== undefined && endSortKey === undefined)
  )
    return true;

  // check if sort key attribute name is modified
  if (currentSortKey?.AttributeName !== endSortKey?.AttributeName) return true;

  // if we got here then the hash and range key are not modified
  return false;
};

/**
 * Configuration for retry limits
 */
export type RetrySettings = {
  times: number; // specifying 1 will execute func once and if not successful, retry one time
  delayMS: number; // delay between each attempt to execute func (there is no initial delay)
  timeoutMS: number; // total amount of time to retry execution
  stopOnError: boolean; // if retries should stop if func throws an error
};

const defaultSettings: RetrySettings = {
  times: Infinity,
  delayMS: 1000 * 10, // 10 seconds
  timeoutMS: 1000 * 60 * 2, // 2 minutes
  stopOnError: false, // terminate the retries if a func calls throws an exception
};

/**
 * Retries the function func until the predicate pred returns true, or until one of the retry limits is met.
 * @param func The function to retry
 * @param successPredicate The predicate that determines successful output of func
 * @param settings Retry limits (defaults to defaultSettings above)
 * @param failurePredicate An optional predicate that determines that the retry operation has failed and should not be retried anymore
 */
const retry = async <T>(
  func: () => Promise<T>,
  successPredicate: (res?: T) => boolean,
  settings?: Partial<RetrySettings>,
  failurePredicate?: (res?: T) => boolean
): Promise<T> => {
  const { times, delayMS, timeoutMS, stopOnError } = {
    ...defaultSettings,
    ...settings,
  };

  let count = 0;
  let result: T;
  let terminate = false;
  const startTime = Date.now();

  do {
    try {
      result = await func();
      if (successPredicate(result)) {
        return result;
      }
      if (typeof failurePredicate === "function" && failurePredicate(result)) {
        throw new Error(
          "Retry-able function execution result matched failure predicate. Stopping retries."
        );
      }
      console.warn(
        `Retry-able function execution did not match success predicate. Result was [${JSON.stringify(
          result
        )}]. Retrying...`
      );
    } catch (err) {
      console.warn(
        `Retry-able function execution failed with [${
          (err as any).message || err
        }]`
      );
      if (stopOnError) {
        console.log("Stopping retries on error.");
      } else {
        console.log("Retrying...");
      }
      terminate = stopOnError;
    }
    count++;
    await sleep(delayMS);
  } while (!terminate && count <= times && Date.now() - startTime < timeoutMS);

  throw new Error(
    "Retry-able function did not match predicate within the given retry constraints"
  );
};

const sleep = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
