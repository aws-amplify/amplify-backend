# Preview: AWS Amplify's new code-first DX (Gen 2) for building backends

This next generation of Amplify’s backend building experience lets you author your frontend and backend definition completely with TypeScript, a file convention, and Git branch-based environments, is now available in Preview. To learn more, please visit [AWS Amplify (Gen 2)](https://docs.amplify.aws/gen2/).

## Quickstart

To quickly get started with Amplify (Gen 2), please visit [AWS Amplify (Gen 2) Quickstart](https://docs.amplify.aws/gen2/start/quickstart/).

```bash
npm create amplify@latest
```

## Package Manager Support

- NPM, Yarn, PNPM are officially supported.
- NodeJS 20 or later version is required for Yarn because of the NodeJS [loader bug](https://github.com/nodejs/node/pull/43772) causing yarn [chain loader error](https://github.com/yarnpkg/berry/issues/4694).
- Yarn PnP is not supported. Run `yarn config set nodeLinker node-modules` to use "node-modules".

## Security

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

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
