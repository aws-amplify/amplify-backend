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

## To run a sample project

See the readme in the `example-project` directory

## AmplifyServiceProvider contract

package must export two things:

1. init function that returns an AmplifyServiceProviderFactory
2. builder function that can be used by customers to configure the resource in the `amplify.ts` file
