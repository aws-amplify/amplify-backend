<a href="https://aws-amplify.github.io/" target="_blank">
    <svg style="width:20px;height:20px;color:var(--amplify-colors-font-inverse)" class="amplify-icon" viewBox="0 0 24 22" aria-hidden="true"><path d="M14.3128 20.0394C14.3651 20.1298 14.4618 20.1855 14.5664 20.1855H16.8444C17.0698 20.1855 17.2107 19.942 17.098 19.7472L8.82308 5.44278C8.71037 5.24795 8.4286 5.24795 8.31589 5.44278L7.09981 7.54494C7.09518 7.55294 7.09518 7.56281 7.09981 7.57081L7.10128 7.57334C7.1106 7.58946 7.09894 7.60961 7.08029 7.60961C7.07163 7.60961 7.06363 7.61422 7.0593 7.62171L0.0396396 19.7616C-0.0730193 19.9565 0.0678714 20.2 0.293265 20.2H10.9633C11.1887 20.2 11.3296 19.9564 11.2169 19.7616L10.1254 17.8749C10.0731 17.7845 9.97646 17.7288 9.87184 17.7288H4.4145C4.3018 17.7288 4.23135 17.607 4.28771 17.5096L8.4417 10.3288C8.49805 10.2314 8.63894 10.2314 8.6953 10.3288L14.3128 20.0394Z"></path><path d="M10.1282 2.30989C10.0759 2.40032 10.0759 2.51172 10.1282 2.60214L20.2155 20.0394C20.2678 20.1298 20.3645 20.1855 20.4691 20.1855H22.7412C22.9666 20.1855 23.1075 19.942 22.9948 19.7472L11.7715 0.346077C11.6588 0.151242 11.377 0.151243 11.2643 0.346077L10.1282 2.30989Z"></path></svg>
</a>


# Preview: AWS Amplify's new code-first DX (Gen 2) for building backends

This next generation of Amplify’s backend building experience lets you author your frontend and backend definition completely with TypeScript, a file convention, and Git branch-based environments, is now available in Preview. To learn more, please visit [AWS Amplify Gen2](https://next-release-gen2.d1j0to8e01vtig.amplifyapp.com/gen2/).

## Quickstart 

To quickly get started with Amplify Gen 2, please visit [AWS Amplify Gen2 Quickstart](https://next-release-gen2.d1j0to8e01vtig.amplifyapp.com/gen2/start/quickstart/).

## Manual Installation

First, if your frontend framework of choice doesn't have it already, create your project's package.json with npm init -y. Then, install the Amplify dependencies for building a backend:

```bash
npm add --save-dev @aws-amplify/backend @aws-amplify/backend-cli typescript
```

Next, create the entrypoint for your backend, amplify/backend.ts, with the following content:

```bash
import { defineBackend } from '@aws-amplify/backend';
defineBackend({});
```


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

## Set up your local development environment

```sh
# clone project repo
cd <project directory>
npm run install:local
npm run test
```

`npm run install:local` will run `npm install`, then build all packages in the project and run `npm link`

`npm run test` will run all the unit tests in the project

You should now be able to run the new `amplify` CLI.

#### Other helpful scripts

`npm run watch` will start the tsc server and watch for changes in all packages

`npm run test:coverage:threshold` will let you know if your changes are passing test coverage limits

`npm run test:dir packages/<package directory>` will run only the tests in that directory

`npm run vend` will start a local npm proxy and publish the local packages to this proxy so they can be installed / used as if they were published on npm

`npm run e2e` will run the E2E test suite. Note: you must have valid AWS credentials configured locally to run this command successfully.

## Creating changesets

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and releasing changes.

All changes that affect release artifacts must have a corresponding changeset. To create a changeset run `changeset`.
This will start a walkthrough to author the changeset file. This file should be committed to the repo.

## Publishing packages locally

Publishing packages locally allows you to install local package changes as if they were published to NPM. This is useful for testing or demo scenarios.

To set up a local npm proxy and publish the current local state to the proxy, run `npm run vend`.
This will start a local npm proxy using [Verdaccio](https://verdaccio.org/) and run `changeset version` and `changeset publish`.

This will also point your local npm config to the local npm proxy. At this point you can npm install any packages in the repo and it will pull from the local proxy instead of directly from npm.

To stop the local server and reset your npm registry run `npm run stop:npm-proxy`.

To clear the proxy package cache run `npm run clean:npm-proxy`. This will stop the local proxy and remove all packages you have published.

To start the npm proxy without immediately publishing, run `npm run start:npm-proxy`.

To publish a snapshot to an already running npm proxy run `npm run publish:snapshot:local latest`

## Adding a package

This repo uses a monorepo structure managed by npm workspaces. All the packages in the workspace are under `packages/*`

There are package templates for some common scenarios in the `templates` directory.
These templates can be copied to a new package directory using `npm run new -- --template=<template> --name=<new name>`
`--template` specifies which template to use and `--name` specifies the new package name.
Valid templates are the directories in the `templates` directory

If you are adding a new package that does not have a template, consider adding a template for that package type.
You'll probably want to use an existing template as a starting point for the new package.

At a minimum, each package needs:

1. A `package.json` file
2. A `tsconfig.json` file. This file should extend `tsconfig.base.json`
3. An `api-extractor.json` file. This file should extend `api-extractor.base.json`
4. An `update:api` script in the `package.json` file
5. A `typedoc.json` file
6. An `.npmignore` file
