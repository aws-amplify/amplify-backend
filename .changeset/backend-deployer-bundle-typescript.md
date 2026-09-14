---
'@aws-amplify/backend-deployer': patch
---

fix: decouple the deployer's internal type-check from the project's TypeScript version

The deployer type-checks the backend definition using the TypeScript
JavaScript Compiler API. Previously `typescript` was a peer dependency, so
that API was resolved from the project's installed `typescript`. TypeScript 7.0
(the Go rewrite) removed the JavaScript Compiler API, so `deploy` and
`ampx sandbox` crashed with `Cannot read properties of undefined (reading
'readFile')`. `typescript` is now a direct dependency of the deployer so the
type-check runs against a bundled 5.x compiler regardless of the project's
pin, and a clear error is thrown if the resolved compiler still lacks the
JavaScript Compiler API.
