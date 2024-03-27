import { FilesWrittenResult } from '@aws-amplify/plugin-types';

export type GraphqlGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<FilesWrittenResult>;
};
export type FormGenerationOptions = {
  models?: string[];
};
export type GraphqlFormGenerator = {
  generateForms: (
    options?: FormGenerationOptions
  ) => Promise<GraphqlGenerationResult>;
};
