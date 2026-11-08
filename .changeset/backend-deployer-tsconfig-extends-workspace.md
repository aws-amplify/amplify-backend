---
'@aws-amplify/backend-deployer': patch
---

fix: resolve tsconfig `extends` packages from a hoisted node_modules in the backend type-check

The deployer type-checks the backend with the relative directory of the entry
point, `amplify`. TypeScript then looked for a package in `extends`, such as
`@tsconfig/node24/tsconfig.json`, only in `amplify/node_modules` and in the
`node_modules` of the working directory. In an npm workspace that package is
hoisted to the root `node_modules`, so it was not found, the options from the
base config were dropped, and `ampx sandbox` reported misleading errors such as
`TS1378`. The tsconfig is now parsed with absolute paths, as `tsc -p` does.
