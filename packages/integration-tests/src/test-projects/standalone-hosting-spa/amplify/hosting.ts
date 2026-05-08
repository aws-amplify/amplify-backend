import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'static',
  buildOutputDir: 'dist',
});
