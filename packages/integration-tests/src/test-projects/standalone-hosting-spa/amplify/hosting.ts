import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  skipBuild: true,
});
