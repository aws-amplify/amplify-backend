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
   Please make sure 1> to not install or use `amplify` globally. 2> to use the same Package Manager in one project. 3> when running e2e tests locally without package manager set `npm_config_user_agent` to `npm.
