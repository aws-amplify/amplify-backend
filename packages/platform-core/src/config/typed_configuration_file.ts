import { z } from 'zod';
import { getConfigDirPath } from './get_config_dir_path';
import path from 'path';
import fsp from 'fs/promises';

/**
 * A configuration file with content validation.
 */
export class ZodSchemaTypedConfigurationFile<
  T extends z.ZodTypeAny = z.ZodTypeAny,
> {
  private readonly filePath: string;

  /**
   * Creates configuration file with content validation.
   */
  constructor(
    private readonly schema: T,
    private readonly fileName: string,
    private readonly _fsp = fsp,
  ) {
    this.filePath = path.join(getConfigDirPath('amplify'), fileName);
  }

  read = async (): Promise<z.infer<T>> => {
    const fileContent = await this._fsp.readFile(this.filePath, 'utf-8');
    const jsonParsedContent = JSON.parse(fileContent);
    return this.schema.parse(jsonParsedContent);
  };

  tryRead = async (): Promise<z.infer<T> | undefined> => {
    try {
      return await this.read();
    } catch {
      // TODO print
      return undefined;
    }
  };

  write = async (data: z.infer<T>): Promise<void> => {
    await this._fsp.writeFile(this.filePath, JSON.stringify(data, null, 2));
  };
}
