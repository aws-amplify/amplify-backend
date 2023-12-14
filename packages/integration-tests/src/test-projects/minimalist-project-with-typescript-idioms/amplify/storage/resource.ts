import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({ versioned: true });
