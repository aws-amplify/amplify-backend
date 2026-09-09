import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nextjs',
  environment: {
    CUSTOM_TEST_VAR: 'e2e-test-value-12345',
  },
  errorPages: {
    notFound: './custom-404.html',
  },
});
