import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { myApiFunction } from "./functions/test-function/resource";

const backend = defineBackend({
  auth,
  data,
  myApiFunction,
}, {
  useSingleStack: true
});

const eventSource = new DynamoEventSource(
  backend.data.resources.tables["Todo"],
  {
    startingPosition: StartingPosition.LATEST,
    batchSize: 5,
  }
);

backend.myApiFunction.resources.lambda.addEventSource(eventSource);
