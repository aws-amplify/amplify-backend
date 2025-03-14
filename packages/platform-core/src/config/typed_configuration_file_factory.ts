import { ZodSchemaTypedConfigurationFile } from './typed_configuration_file';
import { z } from 'zod';

export type TypedConfigurationFile<T> = {
  read: () => Promise<T>;
  write: (data: T) => Promise<void>;
  delete: () => Promise<void>;
};

export type TypedConfigurationFileName =
  | 'notices_manifest_cache.json'
  | 'notices_acknowledgments.json'
  | 'notices_printing_tracker.json';

/**
 * Instantiates TypedConfigurationFile
 */
export class TypedConfigurationFileFactory {
  private readonly files: Record<string, TypedConfigurationFile<unknown>>;

  /**
   * initialized empty map of TypedConfigurationFile;
   */
  constructor() {
    this.files = {};
  }
  /**
   * Returns a TypedConfigurationFile
   */
  getInstance = <T extends z.ZodTypeAny>(
    fileName: TypedConfigurationFileName,
    schema: T,
    valueIfDoesNotExists: z.infer<T>,
  ): TypedConfigurationFile<z.infer<T>> => {
    if (this.files[fileName]) {
      return this.files[fileName];
    }

    this.files[fileName] = new ZodSchemaTypedConfigurationFile(
      schema,
      fileName,
      valueIfDoesNotExists,
    );
    return this.files[fileName];
  };
}

export const typedConfigurationFileFactory =
  new TypedConfigurationFileFactory();
