import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  framework: 'nextjs',
  buildOutputDir: '.next',
  compute: { memorySize: 512 },
});
