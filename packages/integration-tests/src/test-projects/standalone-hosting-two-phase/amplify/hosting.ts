import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  buildOutputDir: 'static-site',
});
