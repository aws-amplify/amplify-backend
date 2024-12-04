import { defineFunction } from '@aws-amplify/backend';

export const funcWithSsm = defineFunction({
  name: 'funcWithSsm',
  entry: './func-src/handler_with_ssm.ts',
});

export const funcWithAwsSdk = defineFunction({
  name: 'funcWithAwsSdk',
  entry: './func-src/handler_with_aws_sdk.ts',
});

export const funcWithSchedule = defineFunction({
  name: 'funcWithSchedule',
  entry: './func-src/handler_with_aws_sqs.ts',
  schedule: '* * * * ?',
});

export const funcNoMinify = defineFunction({
  name: 'funcNoMinify',
  entry: './func-src/handler_no_minify.ts',
  bundling: {
    minify: false,
  },
});

export const funcCustomEmailSender = defineFunction({
  name: 'funcCustomEmailSender',
  entry: './func-src/handler_custom_email_sender.ts',
});
