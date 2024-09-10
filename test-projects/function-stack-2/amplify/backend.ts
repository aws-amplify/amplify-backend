import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myApiFunction } from "./functions/test-function/resource";

const backend = defineBackend({
  auth,
  data,
  myApiFunction,
},{
  useSingleStack: true,
});

backend.myApiFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["cognito-idp:ListUsers", "cognito-idp:ListUsersInGroup"],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
