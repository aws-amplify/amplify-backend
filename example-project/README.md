This directory is a basic example of what a "vnext" project might look like. It does not include any frontend code, just the basics of what the backend definition would look like.

The only requirement we will impose on the repo structure is that either an `amplify.ts` or `amplify.yml` file exists in the root of the project

In a real project only one `amplify.ts` or `amplify.yml` would exist, never both. However, in this example project there are both and a `--from-declarative` flag is available on the `vnext synth` command. If set, synth will read from `amplify.yml`. If not set, it will read from `amplify.ts`.

To try out the example project, run

```
cd example-project # if you aren't already in this directory
npx tsc # this step won't be necessary for customers but for the POC I'm not transpiling TS internally in the node process

# if you have not bootstrapped cdk in the account/region you want to push to, do it with
# this will also not be necessary for customers as we will detect and bootstrap internally to the push if needed
# we can detect by looking for the CDK bootstrap ParameterStore parameter
npx cdk bootstrap

# deploy the amplify project
vnext push dev
```
