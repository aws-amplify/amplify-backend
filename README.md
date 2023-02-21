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
npm run test
```

## To run a sample project

```
npm run build
cd example-project
node ../lib/local-transform-shim.js
```

The Amplify transformer will read in the manifest file from the example directory and create CDK CloudAssembly in cdk.out
To deploy, run `npx cdk deploy --app cdk.out --all --require-approval never` (you will also need to specify an AWS profile)

## AmplifyServiceProvider contract

package must export two things:

1. init function that returns an AmplifyServiceProviderFactory
2. builder function that can be used by customers to configure the resource in the `amplify.ts` file
