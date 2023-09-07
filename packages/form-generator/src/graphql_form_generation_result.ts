export type FileName = string;
export type FileContent = string;
/**
 * Result of form generation
 */
export interface GraphqlFormGenerationResult {
  writeToDirectory: (directoryName: string) => Promise<void>;
  components: Record<FileName, FileContent>;
}
