# Description

create-amplify is a package for scaffolding an Amplify project by running `npm create amplify`.

## Usage

In a frontend project folder or empty folder, run `npm create amplify`.

# Frequently Asked Questions

1. Does Amplify support pnpm on Windows?
   No. Amplify uses nested `node_modules`, but "pnpm does not create deep folders, it stores all packages flatly and uses symbolic links to create the dependency tree structure." See details: on [PNPM docs](https://pnpm.io/faq#but-the-nested-node_modules-approach-is-incompatible-with-windows).

2. Does Amplify support [Yarn Plug'n'Play](https://yarnpkg.com/features/pnp)?
   No. Please run `yarn config set nodeLinker node-modules` to use `node_modules` instead.

3. Why do I see `npm_config_user_agent is undefined`?
   The CLI uses this environment variable to determine which package manager to use when spawning processes. To resolve this:
   a. Do not install or use `amplify` globally
   b. Use the same package manager for all commands in a given project
   c. When running E2E tests locally without a package manager, set `npm_config_user_agent` to `npm`.

# Manual Alternative

If you don't want to use [create-amplify](https://www.npmjs.com/package/create-amplify) package, you can alternatively use the following steps.

| Step                                                                                                                                                                                                       | NPM                                                                             | Yarn Classic                                        | Yarn Modern                                                               | PNPM                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| prerequisites                                                                                                                                                                                              |                                                                                 |                                                     | `$ yarn config set nodeLinker node-modules`                               |                                                    |
| create Amplify Project <br> (It runs all the steps below — init, install packages etc.)                                                                                                                    | init/create                                                                     | create                                              | create                                                                    | create                                             |
| Init Project                                                                                                                                                                                               | init -y                                                                         | init -y                                             | init -y                                                                   | init                                               |
| Install Dependencies: <br> aws-amplify                                                                                                                                                                     | install                                                                         | add                                                 | add                                                                       | add                                                |
| Install devDependencies:<br>'@aws-amplify/backend@beta',<br>'@aws-amplify/backend-cli@beta',<br>'aws-cdk@^2',<br>'aws-cdk-lib@^2',<br>'constructs@^10.0.0',<br>'typescript@^5.0.0',<br>'tsx',<br>'esbuild' | install -D                                                                      | add -D                                              | add -D                                                                    | add -D                                             |
| gitignore                                                                                                                                                                                                  | '# amplify',<br>'node_modules',<br>'.amplify',<br>'amplifyconfiguration\*'      |
| generate initial project files                                                                                                                                                                             | 1. mkdir amplify/ <br> 2. copy templates/basic-auth-data/amplify the new folder |
| Init typescript                                                                                                                                                                                            | `npx tsc --init`                                                                | `$ yarn add typescript@^5` <br> `$ yarn tsc --init` | `$ touch yarn.lock` <br>`$ yarn add -D typescript`<br> `$ yarn tsc —init` | `$ pnpm add -D typescript` <br>`$ pnpm tsc --init` |
|                                                                                                                                                                                                            |                                                                                 |                                                     |                                                                           |                                                    |
