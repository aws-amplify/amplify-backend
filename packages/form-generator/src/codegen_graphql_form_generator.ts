import fetch from 'node-fetch';
import fs from 'fs';
import {
  CodegenJobGenericDataSchema,
  StartCodegenJobData,
} from '@aws-sdk/client-amplifyuibuilder';
import { retry } from './retry.js';
import path from 'path';
import { CodegenJobHandler } from './codegen_job_handler.js';

export interface GraphqlFormGenerationResponse {
  writeToDirectory: (directoryName: string) => Promise<void>;
}

export interface GraphqlFormGenerationStrategy {
  generateForms: () => Promise<GraphqlFormGenerationResponse>;
}

interface CodegenGraphqlFormGeneratorParameters {
  apiId: string;
  appId: string;
  environmentName?: string;
  introspectionSchemaUrl: string;
}
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
    private modelIntrospectionSchemaFetcher: () => Promise<CodegenJobGenericDataSchema>
  ) {}
  generateForms = async () => {
    const schema = await this.modelIntrospectionSchemaFetcher();
    const job = this.generateJobInput(
      schema,
      this.config.apiId,
      this.config.environmentName
    );
    const manifestUrl = await this.jobHandler.execute(job);
    const downloads = await downloadUIComponents(manifestUrl);
    return {
      writeToDirectory: async (outputDir: string) => {
        await writeUIComponentsToFile(downloads, outputDir);
      },
    };
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
              typesFilePath: '../graphql/types',
              queriesFilePath: '../graphql/queries',
              mutationsFilePath: '../graphql/mutations',
              subscriptionsFilePath: '../graphql/subscriptions',
              fragmentsFilePath: '../graphql/fragments',
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

type GeneratedFormMetadata = {
  downloadUrl: string | undefined;
  fileName: string;
  schemaName: string;
  error: string | undefined;
};

/* eslint-disable @typescript-eslint/naming-convention */
type Manifest = { Output: GeneratedFormMetadata[] };

type DownloadResult = {
  content?: string;
  error?: string;
  fileName: string;
};

const downloadComponent = async (
  output: GeneratedFormMetadata
): Promise<DownloadResult> => {
  if (typeof output.downloadUrl == 'string' && !output.error) {
    try {
      const response = await retry(() => fetch(output.downloadUrl as string));
      if (!response.ok) {
        throw new Error(`Failed to download ${output.fileName}`);
      }
      return {
        content: await response.text(),
        error: undefined,
        fileName: output.fileName,
      };
    } catch (error) {
      return {
        error: `Failed to download ${output.fileName}`,
        content: undefined,
        fileName: output.fileName,
      };
    }
  } else {
    return {
      error: output.error,
      content: undefined,
      fileName: output.fileName,
    };
  }
};

const writeUIComponentsToFile = async (
  downloads: DownloadResult[],
  outputDir: string
) => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  for (const downloaded of downloads) {
    if (downloaded.content) {
      fs.writeFileSync(
        path.join(outputDir, downloaded.fileName),
        downloaded.content
      );
    }
  }
};
const downloadUIComponents = async (url: string) => {
  const manifestResponse = await retry(() => fetch(url));
  if (!manifestResponse.ok) {
    throw new Error('Failed to download component manifest file');
  }
  const manifestFile = await (<Promise<Manifest>>manifestResponse.json());

  return Promise.all(manifestFile.Output.map(downloadComponent));
};
