import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  framework: 'spa',
  buildCommand: 'node build.js',
  buildOutputDir: '../dist',
});
