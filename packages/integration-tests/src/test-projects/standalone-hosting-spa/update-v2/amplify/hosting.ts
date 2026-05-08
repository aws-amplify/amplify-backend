import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  buildOutputDir: 'dist',
  logging: { enabled: true },
});
