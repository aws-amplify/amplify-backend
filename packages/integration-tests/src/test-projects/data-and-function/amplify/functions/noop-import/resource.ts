import { defineFunction } from '@aws-amplify/backend';

export const noopImport = defineFunction({
  name: 'noop-import',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
