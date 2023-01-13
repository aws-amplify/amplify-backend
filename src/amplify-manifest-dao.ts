import { Type } from "class-transformer";
import { AmplifyManifest, ResourceDefinition, ResourceRecord, TransformerRecord, TransformKey } from "./manifest-types";

export class AmplifyManifestDAO implements AmplifyManifest {
  @Type(() => ResourceDefinitionDAO)
  resources: ResourceRecord;

  @Type(() => String)
  transformers: TransformerRecord;
}

export class ResourceDefinitionDAO implements ResourceDefinition {
  transformer: TransformKey;
  definition: Record<string, unknown>;
}
