import { Tags } from 'aws-cdk-lib/core';

declare module '@aws-amplify/backend' {
  export type MergedDefineBackendReturn = ReturnType<
    typeof import('@aws-amplify/backend').defineBackend
  > & {
    addTag: Tags['add'];
    removeTag: Tags['remove'];
  };

  export function defineBackendTags(
    props: import('@aws-amplify/backend').DefineBackendProps
  ): MergedDefineBackendReturn;
}
