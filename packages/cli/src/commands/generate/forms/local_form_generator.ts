import { FormGenerator } from './form_generator.js';
import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';

export type LocalFormGenerationConfig = {
  apiId: string;
};
/**
 * Creates UI Forms locally based on an appsync api id
 */
export class LocalFormGenerator implements FormGenerator<void> {
  private appSyncClient;
  /**
   * Instantiates a LocalFormGenerator
   */
  constructor(private config: LocalFormGenerationConfig) {
    this.appSyncClient = new AppSyncClient();
  }

  private getAppSyncIntrospectionSchema = async (apiId: string) => {
    const result = await this.appSyncClient.send(
      new GetIntrospectionSchemaCommand({
        apiId,
        format: 'JSON',
      })
    );
    const decoder = new TextDecoder();

    return decoder.decode(result.schema);
  };
  /**
   * Generates a form based on the config passed into the constructor.
   * The forms are persisted to disk
   */
  async generateForms(): Promise<void> {
    const schema = await this.getAppSyncIntrospectionSchema(this.config.apiId);
    //    console.log(JSON.stringify(this.config, null, 2));
    console.log(schema);
  }
}
