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

GitHub provides additional documentation on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Project architecture

Understanding the structure of the current codebase is a great first step to knowing where to implement a change. Check out the [Project Architecture README](./PROJECT_ARCHITECTURE.md) for information on how the repo is structured.
Also check out the README files in the root of each package directory for a brief description of the intent of that package.

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Set up your local development environment

```sh
# clone project repo
cd <project directory>
npm run setup:local
npm run test
```

`npm run setup:local` will run `npm install`, then build all packages in the project. It also links the ampx and create-amplify bin files into the project node_modules folder.

`npm run test` will run all the unit tests in the project

You should now be ready to start contributing to the project!

### Other helpful scripts

`npm run watch` will start the tsc server and watch for changes in all packages

`npm run test:coverage:threshold` will let you know if your changes are passing test coverage limits

`npm run test:dir packages/<package directory>` will run only the tests in that directory

`npm run vend` will start a local npm proxy and publish the local packages to this proxy so they can be installed / used as if they were published on npm

`npm run e2e` will run the E2E test suite. Note: you must have valid AWS credentials configured locally to run this command successfully.

### Testing changes locally

For local testing we recommend writing unit tests that exercise the code you are modifying as you are making changes. Individual test files can be run using:

```sh
npm run test:dir packages/<package name>/lib/<file-name>.test.ts
```

> Note: You must rebuild using `npm run build` for tests to pick up your changes.

Sometimes it's nice to have a test project to use as a testing environment for local changes. You can create test projects in the `local-testing` directory using

```sh
npm run setup:test-project <name>
```

This allows you to make local changes and immediately try them out in a test project. All projects that you create in this directory are gitignored.

Depending on the scope of the change you are making, integration tests and/or E2E tests may be necessary.

Integration tests are located [here](./packages/integration-tests/src/test-in-memory/). These tests operate mostly like unit tests but they exercise many different components and packages together. However, these tests do NOT make service calls. Test assertions can be set up using the [CDK assertions library](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html).

E2E tests are located [here](./packages/integration-tests/src/test-e2e/). These tests exercise full end-to-end features with no mocking or stubbing. These tests do make service calls and therefore require valid AWS credentials to run. Tests should be added to this suite very sparingly as these tests are the most time consuming to run and maintain. If possible, additional features should be tested by adding on to existing tests rather than adding entirely new tests.

### Creating changesets

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and releasing changes.

All changes that affect release artifacts must have a corresponding changeset. To create a changeset run `changeset`.
This will start a walkthrough to author the changeset file. This file should be committed to the repo.

### Publishing packages locally

Publishing packages locally allows you to install local package changes as if they were published to NPM. This can be useful for testing or demo scenarios.

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
7. A `README.md` file that gives a brief description of the intent of the package

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
