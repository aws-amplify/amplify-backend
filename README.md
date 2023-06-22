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

You should now be able to run the `vnext` CLI.

#### Other helpful scripts

`npm run watch` will start the tsc server and watch for changes in all packages

`npm run test:coverage:threshold` will let you know if your changes are passing test coverage limits

`npm run test packages/<package directory>` will run only the tests in that directory

`npm run vend` will start a local npm proxy and publish the local packages to this proxy so they can be installed / used as if they were published on npm

## Creating changesets

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and releasing changes.

All changes that affect release artifacts must have a corresponding changeset. To create a changeset run `changeset`.
This will start a walkthrough to author the changeset file. This file should be committed to the repo.

## Publishing packages locally

Publishing packages locally allows you to install local package changes as if they were published to NPM. This is useful for testing or demo scenarios.

To set up a local npm proxy and publish the current local state to the proxy, run `npm run vend`.
This will start a local npm proxy using [Verdaccio](https://verdaccio.org/) and run `changeset version` and `changeset publish`.
Note that you will need to create a changeset for any local changes for them to be included in the published artifacts.

This will also point your local npm config to the local npm proxy. At this point you can npm install any packages in the repo and it will pull from the local proxy instead of directly from npm.

To stop the local server and reset your npm registry run `npm run stop:npm-proxy`.

To clear the proxy package cache run `npm run clean:npm-proxy`. This will remove all packages you have published to the local proxy.

To start the npm proxy without immediately publishing, run `npm run start:npm-proxy`.

To publish a snapshot to an already running npm proxy run `npm run publish:snapshot:local latest`

## Adding a package

This repo uses a monorepo structure managed by npm workspaces. All the packages in the workspace are under `packages/*`

Most package types that you might want to add to this repo should have templates in the `templates` directory.
These templates can be copied to a new package directory using `npm run new:*` where \* is the type of package you are creating (see `package.json` for available scripts)

If you are adding a new package that does not have a template, consider adding a template for that package type.
You'll probably want to use an existing template as a starting point for the new package.

At a minimum, each package needs:

1. A `package.json` file
2. A `tsconfig.json` file. This file should extend `tsconfig.base.json`
3. An `api-extractor.json` file. This file should extend `api-extractor.base.json`
4. An `update:api` script in the `package.json` file
5. A `typedoc.json` file
