/** Mapping of geography names to their regions. */
export type RegionGroups = Record<string, string[]>;

/** Configuration for a model within a specific geography. */
export type AiModelMapping = {
  /** Inference profile ID for cross-region inference, null if not available. */
  inferenceProfileId: string | null;
  /** Regions that can source requests for this model using cross-region inference. */
  supportsCriFrom: string[];
  /** Regions where cross-region inference is required. */
  requiresCriIn: string[];
};

/** Model entry containing geography-specific configurations. */
export type AiModelsEntry = {
  geographies: Record<string, AiModelMapping>;
};

/** Root structure of the models JSON data. */
export type AiModelsManifest = {
  schemaVersion: 1;
  lastUpdated: string;
  regionGroups: RegionGroups;
  models: Record<string, AiModelsEntry>;
};

/** Configuration for AI model ARN and ID generation. */
export type AiModelConfig = {
  modelId: string;
  region: string;
  crossRegionInference: boolean;
};
