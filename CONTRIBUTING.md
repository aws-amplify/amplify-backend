# Contributing Guidelines

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary
information to effectively respond to your bug report or contribution.

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already
reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

- A reproducible test case or series of steps
- The version of our code being used
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

## Contributing via Pull Requests

Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the _main_ branch.
2. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
3. You open an issue to discuss any significant work - we would hate for your time to be wasted.

To send us a pull request, please:

1. Fork the repository.
2. Modify the source; please focus on the specific change you are contributing. If you also reformat all the code, it will be hard for us to focus on your change.
3. Ensure local tests pass.
4. Commit to your fork using clear commit messages.
5. Send us a pull request, answering any default questions in the pull request interface.
6. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Contribute to create-amplify package

### Set up your local development environment

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

### Creating changesets

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and releasing changes.

All changes that affect release artifacts must have a corresponding changeset. To create a changeset run `changeset`.
This will start a walkthrough to author the changeset file. This file should be committed to the repo.

### Publishing packages locally

Publishing packages locally allows you to install local package changes as if they were published to NPM. This is useful for testing or demo scenarios.

To set up a local npm proxy and publish the current local state to the proxy, run `npm run vend`.
This will start a local npm proxy using [Verdaccio](https://verdaccio.org/) and run `changeset version` and `changeset publish`.

This will also point your local npm config to the local npm proxy. At this point you can npm install any packages in the repo and it will pull from the local proxy instead of directly from npm.

To stop the local server and reset your npm registry run `npm run stop:npm-proxy`.

To clear the proxy package cache run `npm run clean:npm-proxy`. This will stop the local proxy and remove all packages you have published.

To start the npm proxy without immediately publishing, run `npm run start:npm-proxy`.

To publish a snapshot to an already running npm proxy run `npm run publish:snapshot:local latest`

### Adding a package

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

### Dev

1. Publish to local

You have to publish to local every time after making a change

```sh
# In amplify-backend repo
npm run clean
npm run install:local
npm run build
npm run vend
```

2. Prepare to install

```sh
# On your local machine
rm -rf $(npm config get cache)/_npx # clean npm cache globally
mkdir amplify-project-$(date +%Y-%m-%d) # create an empty folder. Alternatively, you can create a project by running e.g `npx create-next-app next-$(date +%Y-%m-%d)`.
cd amplify-project-$(date +%Y-%m-%d) # cd into the empty folder
```

3. Create Amplify Project

```sh
# In the folder created in the previous step
npm create amplify
```

### Test

```sh
# In amplify-backend repo
npm run build # Have to build every time after making a change before running test
npm run test:dir packages/create-amplify # Run all test in create-amplify
npm run test:dir packages/create-amplify/src/<file-name>.test.ts # Run all test in one file. e.g. npm run test:dir packages/create-amplify/src/get_project_root.test.ts
```

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
