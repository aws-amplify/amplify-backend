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
4. An `api:update` script in the `package.json` file
5. A `typedoc.json` file
