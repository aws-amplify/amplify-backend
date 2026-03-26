import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  framework: 'spa',
  buildOutputDir: '../static-site',
  domain: {
    domainName: 'www.e2e-test.example.com',
    hostedZone: 'e2e-test.example.com',
  },
  waf: {
    enabled: true,
  },
});
