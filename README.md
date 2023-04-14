## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

## To start developing

```
# clone project repo
cd <project directory>
npm install
npm run build
# this script assumes that your global node bin dir is on your PATH
npm run set-path
npm run test
```

You should now be able to run `vnext` and get some help output of available subcommands

## To run a sample project

See the readme in the `example-project` directory

## 10000 ft overview

### `adaptors`

This directory contains the adaptors and (some) builders for various feature verticals.

An adaptor is a layer between CDK constructs (either L1, 2, or 3) and our platform layer. The adaptors extend the ConstructAdaptor base class defined in `types.ts`
A builder is a class that customers interact with directly in their `amplify.ts` file. This builder class provides a nice abstraction for customers to configure resources and wire them together. It exposes a `_build()` method that is used internall to serialize the config to a declarative IR format

### `commands`

This directory contains all of the CLI command entry points. It also contains `shared-components.ts` which are... wait for it... bits of code that are shared across commands and use the mixin pattern to compose command parts together.

### `input-definition`

This directory has the base class of the builder classes described above. This base class contains most of the logic and the implementaions only need to provide some basic customizations. The `ir-definition.ts` contains zod objects and inferred types for the shape of the declarative IR definition

### `observability-tooling`

The stuff here is largely unused in the POC but it contains some stubs of classes that we can inject into the platform for logging and metrics

### `stubs`

This is also pretty much empty but it has a small wrapper around ParameterStore that the `vnext params` command uses for CRUD operations on params. This probably won't exist in the final product. Instead we will just have CRUD management for secrets and rely on normal CI/CD env vars for other parameterization

### `transformer`

The `transformer-factory` and `transformer` are the important files here. This is where the "Amplify CDK transform" gets initialized and executed.

### other files in `src`

#### `amplify-reference`

This is a CDK construct for creating "weak references" between stacks. Ie it uses ParameterStore to pass a value between two stacks rather than CFN imports/exports. imports/exports are problematic because they require two deployments whenever an export needs to be removed (which could happen whenever a resource is removed from the project)

#### `amplify-toolbox`

This is the entry point to the "vnext" CLI. It imports all the commands from the `commands` directory and places them as subcommands under the root "vnext" command

#### `configure-profile`

Utility function for configuring the AWS SDK

#### `execute-cdk-command`

Utility function for shelling out to the CDK CLI

#### `types`

Contains the "Plugin Interface". This is the abstract class that all feature vertical adaptor plugins must extend.

package must export two things:

1. init function that returns an AmplifyServiceProviderFactory
2. builder function that can be used by customers to configure the resource in the `amplify.ts` file
## Getting Started
1. Run `npm install && npm run install:local`

This will build the project and link the vnext CLI so it is available at `vnext`

Run `npm run test` to execute the test suite
