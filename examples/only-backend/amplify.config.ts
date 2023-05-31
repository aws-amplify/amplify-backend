import { defineConfig } from 'aws-amplify-backend';
import type { OnSuccessEvent, OnFailureEvent } from 'aws-amplify-backend';

export default defineConfig({
  // draw inspiration from https://vitejs.dev/config/shared-options.html#envdir
  envDir: './',
  // draw inspiration from https://nuxt.com/docs/api/configuration/nuxt-config#hooks
  hooks: {
    onSuccess(event: OnSuccessEvent) {
      console.log('onSuccess', event);
    },
    onFailure(event: OnFailureEvent) {
      console.log('onFailure', event);
    },
  },
});
