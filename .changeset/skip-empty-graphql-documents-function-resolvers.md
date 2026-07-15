---
'@aws-amplify/model-generator': patch
---

fix(model-generator): skip empty graphql documents to prevent Unexpected <EOF> with @function resolvers

When an Amplify Data schema exposes only `@function`-backed custom operations and no `@model` types, AppSync generates no subscriptions. The code generation formatter still emits a comment-only document for the empty `subscriptions` operation type, and passing that comment-only string to `graphql.parse()` throws `Syntax Error: Unexpected <EOF>`, aborting the entire `ampx generate graphql-client-code` run. Empty and comment-only operation documents are now filtered out before they reach the parser, so codegen succeeds for `@function`-only schemas. Fixes #3280.
