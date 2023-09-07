export type TargetLanguage = 'typescript';

export type ModelGenerationParameters = {
  language: TargetLanguage;
  outDir: string;
};
export interface GraphqlModelGenerator {
  generateModels: (params: ModelGenerationParameters) => Promise<void>;
}
