import fetch from 'node-fetch';
import path from 'path';
import {
  CodegenJobGenericDataSchema,
  StartCodegenJobData,
} from '@aws-sdk/client-amplifyuibuilder';
import { retry } from './retry.js';
import { CodegenJobHandler } from './codegen_job_handler.js';
import { GraphqlFormGenerationResult } from './graphql_form_generation_result.js';
import { CodegenGraphqlFormGeneratorResult } from './codegen_graphql_form_generation_result.js';
import {
  DownloadResult,
  GeneratedFormMetadata,
  Manifest,
} from './codegen_responses.js';

export type GraphqlFormGenerationStrategy = {
  generateForms: () => Promise<GraphqlFormGenerationResult>;
};

type CodegenGraphqlFormGeneratorParameters = {
  apiId: string;
  appId: string;
  environmentName?: string;
  introspectionSchemaUrl: string;
};

/**
 * Generates forms on the local filesystem
 */
export class CodegenGraphqlFormGenerator
  implements GraphqlFormGenerationStrategy
{
  /**
   * Accepts a jobHandler and a generation config
   */
  constructor(
    private jobHandler: CodegenJobHandler,
    private config: CodegenGraphqlFormGeneratorParameters,
    private modelIntrospectionSchemaFetcher: () => Promise<CodegenJobGenericDataSchema>,
    private relativePathToGraphqlModelDirectory: string
  ) {}
  generateForms = async () => {
    const schema = await this.modelIntrospectionSchemaFetcher();
    const job = this.generateJobInput(
      schema,
      this.config.appId,
      this.config.environmentName
    );
    const manifestUrl = await this.jobHandler.execute(job);
    const components = await this.downloadComponentsForManifestUrl(manifestUrl);
    return new CodegenGraphqlFormGeneratorResult(components);
  };
  private downloadComponent = async (
    output: GeneratedFormMetadata
  ): Promise<DownloadResult> => {
    if (output.error) {
      throw new Error(output.error);
    }
    if (typeof output.downloadUrl !== 'string') {
      throw new Error('Could not parse download url');
    }
    try {
      const response = await retry(() => fetch(output.downloadUrl as string));
      if (!response.ok) {
        throw new Error(`Failed to download ${output.fileName}`);
      }
      return {
        content: await response.text(),
        fileName: output.fileName,
      };
    } catch (e) {
      throw new Error(`Failed to download UI Component.`);
    }
  };
  private downloadComponentsForManifestUrl = async (url: string) => {
    const manifestResponse = await retry(() => fetch(url));
    if (!manifestResponse.ok) {
      throw new Error('Failed to download component manifest file');
    }
    const manifestFile = await (<Promise<Manifest>>manifestResponse.json());

    return Promise.all(manifestFile.Output.map(this.downloadComponent));
  };
  private generateJobInput = (
    genericDataSchema: CodegenJobGenericDataSchema,
    appId: string,
    environmentName?: string
  ) => {
    const codegenJobToCreate: StartCodegenJobData = {
      autoGenerateForms: true,
      genericDataSchema,
      renderConfig: {
        react: {
          module: 'es2020',
          target: 'es2020',
          script: 'jsx',
          renderTypeDeclarations: true,
          apiConfiguration: {
            graphQLConfig: {
              typesFilePath: path.join(
                this.relativePathToGraphqlModelDirectory,
                'types'
              ),
              queriesFilePath: path.join(
                this.relativePathToGraphqlModelDirectory,
                'queries'
              ),
              mutationsFilePath: path.join(
                this.relativePathToGraphqlModelDirectory,
                'mutations'
              ),
              subscriptionsFilePath: path.join(
                this.relativePathToGraphqlModelDirectory,
                'subscriptions'
              ),
              fragmentsFilePath: path.join(
                this.relativePathToGraphqlModelDirectory,
                'fragments'
              ),
            },
          },
        },
      },
    };
    return {
      appId,
      clientToken: '',
      environmentName,
      codegenJobToCreate,
    };
  };
}
