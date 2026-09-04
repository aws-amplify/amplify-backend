import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  errorPages: { notFound: './custom-404.html' },
});
