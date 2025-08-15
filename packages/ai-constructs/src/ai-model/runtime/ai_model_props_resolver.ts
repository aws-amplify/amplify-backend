import models from '../models/models.json';
import type {
  AiModelConfig,
  AiModelMapping,
  AiModelsEntry,
  AiModelsManifest,
} from '../ai_model_types';

/**
 * Resolves AI model properties based on region and cross-region inference requirements.
 */
export class AiModelPropsResolver {
  private readonly data: AiModelsManifest;

  /**
   * Creates a new AI model properties resolver.
   */
  constructor() {
    this.data = models as AiModelsManifest;
  }

  /**
   * Resolves the effective model ID based on cross-region inference requirements.
   * Returns inference profile ID if CRI is required/enabled, otherwise foundation model ID.
   */
  public resolveModelId(modelConfig: AiModelConfig): string {
    const { modelId, region, crossRegionInference } = modelConfig;

    // Cloudformation passes `crossRegionInference` as a string
    const criEnabled =
      typeof crossRegionInference === 'boolean'
        ? crossRegionInference
        : crossRegionInference === 'true';

    // Return as-is if already a known inference profile
    if (this.isKnownInferenceProfile(modelId)) return modelId;

    this.validateModelId(modelId);
    const geography = this.getGeography(region);

    const mustUseCri = this.requiresCri(modelId, region);
    const canUseCri = this.supportsCri(modelId, region);

    if (mustUseCri || (canUseCri && criEnabled)) {
      const inferenceProfileId = this.getInferenceProfileId(modelId, geography);
      return inferenceProfileId;
    }

    return modelId;
  }

  /**
   * Gets the geography group name for a given region.
   */
  public getGeography(region: string): string {
    if (!region || typeof region !== 'string' || !region.trim()) {
      throw new Error(
        'Region parameter is required and must be a non-empty string.',
      );
    }
    const entry = Object.entries(this.data.regionGroups).find(([, regions]) =>
      regions.includes(region),
    );
    if (!entry) {
      throw new Error(`Unknown or unsupported region: ${region}.`);
    }
    return entry[0];
  }

  /**
   * Validates that a foundation model ID exists in the models data.
   */
  public validateModelId(modelId: string): void {
    if (!this.data.models[modelId]) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }
  }

  /**
   * Checks if cross-region inference is required for a model in the given region.
   */
  public requiresCri(modelId: string, region: string): boolean {
    this.validateModelId(modelId);
    const geography = this.getGeography(region);
    const cfg = this.getModelMapping(modelId, geography);
    return cfg.requiresCriIn.includes(region);
  }

  /**
   * Checks if cross-region inference is supported for a model in the given region.
   */
  public supportsCri(modelId: string, region: string): boolean {
    this.validateModelId(modelId);
    const geography = this.getGeography(region);
    const cfg = this.getModelMapping(modelId, geography);
    return (
      Boolean(cfg.inferenceProfileId) && cfg.supportsCriFrom.includes(region)
    );
  }

  /**
   * Gets the inference profile ID for a foundation model in the specified geography.
   */
  public getInferenceProfileId(
    foundationModelId: string,
    geography: string,
  ): string {
    this.validateModelId(foundationModelId);
    const cfg = this.getModelMapping(foundationModelId, geography);
    if (!cfg.inferenceProfileId) {
      throw new Error(
        `No inference profile ID for model "${foundationModelId}" in geography "${geography}".`,
      );
    }
    return cfg.inferenceProfileId;
  }

  /**
   * Gets the foundation model ID from an inference profile ID.
   */
  public getFoundationModelId(inferenceProfileId: string): string {
    if (
      !inferenceProfileId ||
      typeof inferenceProfileId !== 'string' ||
      !inferenceProfileId.trim()
    ) {
      throw new Error(
        'Inference profile ID is required and must be a non-empty string.',
      );
    }

    for (const [fmId, entry] of Object.entries(this.data.models)) {
      for (const cfg of Object.values(entry.geographies)) {
        if (cfg.inferenceProfileId === inferenceProfileId) return fmId;
      }
    }
    throw new Error(`Unknown inference profile ID: ${inferenceProfileId}`);
  }

  /**
   * Checks if the given ID is a known inference profile.
   */
  public isKnownInferenceProfile(modelId: string): boolean {
    if (!modelId || typeof modelId !== 'string') return false;
    for (const entry of Object.values(this.data.models)) {
      for (const cfg of Object.values(entry.geographies)) {
        if (cfg.inferenceProfileId === modelId) return true;
      }
    }
    return false;
  }

  /**
   * Gets regions from which the foundation model can be sourced in the given geography.
   */
  public getSupportedSourceRegions(
    modelId: string,
    geography: string,
  ): string[] {
    this.validateModelId(modelId);
    const cfg = this.getModelMapping(modelId, geography);
    return cfg.supportsCriFrom;
  }

  /**
   * Gets the model mapping configuration for a model in the specified geography.
   */
  private getModelMapping(modelId: string, geography: string): AiModelMapping {
    if (!geography || typeof geography !== 'string') {
      throw new Error('Geography parameter is required and must be a string.');
    }
    const entry: AiModelsEntry | undefined = this.data.models[modelId];
    const geoCfg = entry?.geographies?.[geography];
    if (!geoCfg) {
      const available = entry ? Object.keys(entry.geographies) : [];
      throw new Error(
        `No configuration for model "${modelId}" in geography "${geography}". Available geographies: ${available.join(
          ', ',
        )}`,
      );
    }
    return geoCfg;
  }
}
