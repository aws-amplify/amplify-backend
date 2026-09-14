import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  logging: { enabled: true },
});
