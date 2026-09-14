import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nuxt',
  compute: { memorySize: 512 },
});
