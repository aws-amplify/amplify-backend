import fs from 'fs';
import path from 'path';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  GenerateAPICodeProps,
  GeneratedOutput,
  generateAPICode,
} from './mock_code_generator.js';

export type GenerateGraphqlClientCodeProps = GenerateAPICodeProps;
export type GenerateGraphqlClientCodeToFileProps =
  GenerateGraphqlClientCodeProps & {
    out: string;
  };

/**
 * Adapts wraps calls to the code generator, and generates credentials providers, etc.
 */
export class GraphqlClientCodeGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfigToFile from @aws-amplify/client-config.
   */
  constructor(
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider
  ) {}

  /**
   * Generates the platform-specific graphql client code for a given backend
   */
  generateGraphqlClientCode = (
    props: GenerateGraphqlClientCodeProps
  ): Promise<GeneratedOutput> =>
    generateAPICode({
      ...props,
      // credentialProvider: this.awsCredentialProvider,
    });

  /**
   * Generates the platform-specific graphql client code for a given backend, and write the outputs to the specified target.
   */
  generateGraphqlClientCodeToFile = async (
    props: GenerateGraphqlClientCodeToFileProps
  ): Promise<void> => {
    const { out, ...rest } = props;

    const generatedCode = await generateAPICode({
      ...rest,
      // credentialProvider: this.awsCredentialProvider,
    });

    Object.entries(generatedCode).forEach(([filePathSuffix, fileContents]) => {
      const filePath = path.join(out, filePathSuffix);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, fileContents);
    });
  };
}
