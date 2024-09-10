import {
  defineFunction,
} from "@aws-amplify/backend";

export const myApiFunction = defineFunction({
  resourceGroupName: 'function1'
});
