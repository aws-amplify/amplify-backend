export interface GraphqlModelGenerator {
  generateModels: () => Promise<void>;
}
