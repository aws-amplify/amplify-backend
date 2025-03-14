import { z } from 'zod';
import { getConfigDirPath } from './get_config_dir_path';
import path from 'path';
import fsp from 'fs/promises';
import { existsSync } from 'fs';
import { TypedConfigurationFile } from './typed_configuration_file_factory';

/**
 * A configuration file with content validation.
 */
export class ZodSchemaTypedConfigurationFile<T extends z.ZodTypeAny>
  implements TypedConfigurationFile<z.infer<T>>
{
  private readonly filePath: string;
  private data: z.infer<T> | undefined;

  /**
   * Creates configuration file with content validation.
   */
  constructor(
    private readonly schema: T,
    fileName: string,
    private readonly valueIfDoesNotExists: z.infer<T>,
    private readonly _fsp = fsp,
    private readonly _existsSync = existsSync,
  ) {
    this.filePath = path.join(getConfigDirPath('amplify'), fileName);
  }

  read = async (): Promise<z.infer<T>> => {
    if (!this.data) {
      if (existsSync(this.filePath)) {
        const fileContent = await this._fsp.readFile(this.filePath, 'utf-8');
        const jsonParsedContent = JSON.parse(fileContent);
        this.data = this.schema.parse(jsonParsedContent);
      } else {
        this.data = this.schema.parse(this.valueIfDoesNotExists);
      }
    }
    // return deep clone.
    return this.schema.parse(this.data);
  };

  write = async (data: z.infer<T>): Promise<void> => {
    await this._fsp.writeFile(this.filePath, JSON.stringify(data, null, 2));
    this.data = data;
  };

  delete = async (): Promise<void> => {
    if (this._existsSync(this.filePath)) {
      await this._fsp.unlink(this.filePath);
    }
    this.data = undefined;
  };
}
