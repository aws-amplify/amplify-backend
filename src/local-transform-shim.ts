import "reflect-metadata";
import { App } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as fs from "fs-extra";
import { AmplifyTransform } from "./amplify-transform";
import { getAmplifyResourceTransform as getStorageTransform } from "./amplify-storage";
import { getAmplifyResourceTransform as getFunctionTransform } from "./amplify-function";
import { hydrateTokens } from "./hydrate-tokens";
import { AmplifyManifest, TransformKey } from "./manifest-types";
import {
  AmplifyResourceTransform,
  AmplifyResourceTransformFactory,
} from "./types";
import { consoleLogger } from "./amplify-logger";
import { amplifyMetrics } from "./amplify-metrics";

const start = async () => {
  const tokenizedManifest = JSON.parse(
    await fs.readFile("manifest.amplify.json", "utf8")
  );

  // manifest parameters will be loaded from our metadata service for the specified account/region/envName tuple
  const params: Record<string, string> = {
    testFuncTimeout: "100",
  };

  // TODO will need more validation here to assert that manifest is correctly formed
  const hydratedManifest = hydrateTokens<AmplifyManifest>(
    tokenizedManifest,
    params
  );

  // this is a placeholder for what would be a fetch to npm / check local cache for the transformer defined in the manifest
  // each transformer package would export a factory function named "getAmplifyResourceTransform" which returns an instance of an AmplifyResourceTransform
  const remoteFetchPlaceholder: Record<
    string,
    AmplifyResourceTransformFactory
  > = {
    "@aws-amplify/s3-transform@1.2.3": getStorageTransform,
    "@aws-amplify/lambda-transform@2.3.4": getFunctionTransform,
  };

  const transformers: Record<TransformKey, AmplifyResourceTransform> = {};
  Object.entries(hydratedManifest.transformers).forEach(
    ([transformerKey, transformerName]) => {
      // transformer factory is injected with everything it needs from the platform here
      transformers[transformerKey] = remoteFetchPlaceholder[transformerName](
        cdk,
        consoleLogger,
        amplifyMetrics
      );
    }
  );

  // Note the CDK app is constructed outside of the AmplifyTransform. The AmplifyTransform is a CDK construct that is portabe to any CDK App
  const app = new App({ outdir: "cdk.out" });
  const amplifyTransform = new AmplifyTransform(
    app,
    "dev",
    hydratedManifest.resources,
    transformers
  );
  amplifyTransform.transform();
  app.synth();
};

start().catch((err) => console.log(err));
