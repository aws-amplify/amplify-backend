import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nextjs',
  buildOutputDir: '.next',
});
