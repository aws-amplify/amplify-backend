import { App, CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import path from 'node:path';
import fs from 'node:fs';

export type FrontendConfig = {
  stackName: string;
  buildCommand: string;
  buildOutputDir: string;
};

/**
 * Defines frontend hosting infrastructure (S3 + CloudFront) for SPAs.
 * Call from amplify/frontend.ts.
 */
export const defineFrontend = (config: FrontendConfig): void => {
  const frontendOutDir = path.resolve(
    process.cwd(),
    '.amplify/artifacts/frontend.out',
  );
  const app = new App({ outdir: frontendOutDir });
  const stack = new Stack(app, config.stackName);

  const bucket = new s3.Bucket(stack, 'FrontendBucket', {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });

  const distribution = new cloudfront.Distribution(stack, 'Distribution', {
    defaultBehavior: {
      origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      },
    ],
  });

  // Resolve the build output directory relative to cwd
  const buildOutputPath = path.resolve(process.cwd(), config.buildOutputDir);

  // BucketDeployment uploads the build output and invalidates CloudFront
  // The directory must exist at synth time — the CLI runs the build before synth.
  if (fs.existsSync(buildOutputPath)) {
    new s3deploy.BucketDeployment(stack, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(buildOutputPath)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }

  new CfnOutput(stack, 'FrontendUrl', {
    value: `https://${distribution.distributionDomainName}`,
  });

  new CfnOutput(stack, 'BucketName', {
    value: bucket.bucketName,
  });

  new CfnOutput(stack, 'DistributionId', {
    value: distribution.distributionId,
  });

  // Store build config as outputs so the CLI can read them
  new CfnOutput(stack, 'BuildCommand', {
    value: config.buildCommand,
  });

  new CfnOutput(stack, 'BuildOutputDir', {
    value: config.buildOutputDir,
  });

  // Register synth listener — the CLI emits this after running the build
  process.once('message', (message) => {
    if (message !== 'amplifyFrontendSynth') {
      return;
    }
    app.synth();
  });
};

/**
 * Returns deployment context.
 */
export const getContext = (): { stage: string } => {
  return {
    stage: process.env.AMPLIFY_STAGE || 'dev',
  };
};
