import { defineHosting } from '@aws-amplify/hosting';
defineHosting({
    framework: 'nextjs',
    compute: { memorySize: 512 },
});
