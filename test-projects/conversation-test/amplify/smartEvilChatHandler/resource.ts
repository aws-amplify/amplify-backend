import { defineFunction } from '@aws-amplify/backend';

export const smartEvilChatHandler = defineFunction({
  timeoutSeconds: 60,
});
