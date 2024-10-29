import { defineFunction } from "@aws-amplify/backend";

export const todoCount = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: "todo-count",
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: "./handler.ts",
  timeoutSeconds: 30,
});
