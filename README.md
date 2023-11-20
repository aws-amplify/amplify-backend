# Preview: AWS Amplify's new code-first DX (Gen 2) for building backends

This next generation of Amplify’s backend building experience lets you author your frontend and backend definition completely with TypeScript, a file convention, and Git branch-based environments, is now available in Preview. To learn more, please visit [AWS Amplify (Gen 2)](https://docs.amplify.aws/gen2/).

## Quickstart 

To quickly get started with Amplify Gen 2, please visit [AWS Amplify (Gen 2) Quickstart](https://docs.amplify.aws/gen2/start/quickstart/).

## Manual Installation

First, if your frontend framework of choice doesn't have it already, create your project's `package.json` with `npm init -y`. Then, install the Amplify dependencies for building a backend:

```bash
npm add --save-dev @aws-amplify/backend @aws-amplify/backend-cli typescript
```

Next, create the entrypoint for your backend, `amplify/backend.ts`, with the following content:

```ts
import { defineBackend } from '@aws-amplify/backend';
defineBackend({});
```

Now you can run the following command to create your first backend!

```bash
npx amplify sandbox
```

### Define Amplify Auth

You can use `define*` functions to define your resources. For example, you can define authentication:

```ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true
  }
});
```

### Define Amplify Data

Define your data resource using the following command:

```ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema
});
```

## Security

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Community

Join the [Discord Server](https://discord.com/invite/amplify). 

## Tutorials

- [Quickstart](https://docs.amplify.aws/gen2/start/quickstart/)
- [Set up Amplify Auth](https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/)
- [Set up Amplify Data](https://docs.amplify.aws/gen2/build-a-backend/data/set-up-data/)

## Contributing Guidelines

Thank you for your interest in contributing to our project. Please visit [CONTRIBUTING](CONTRIBUTING.md) for additional information on contributing to this project.

## License

This project is licensed under the Apache-2.0 License.


