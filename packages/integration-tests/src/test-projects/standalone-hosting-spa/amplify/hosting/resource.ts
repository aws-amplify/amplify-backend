import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  framework: 'spa',
  buildOutputDir: 'static-site',
});
