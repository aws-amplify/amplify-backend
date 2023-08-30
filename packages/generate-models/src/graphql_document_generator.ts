import fs from 'fs';
import path from 'path';
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

export interface GraphQLDocumentGenerationStrategy {
  generateDocuments: () => Promise<void>;
}
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class GraphQLClientGenerator {
  /**
   * Configures the GraphQLClientGenerator
   */
  constructor(
    private appSyncClient: AppSyncClient,
    private path: string,
    private formatter: GraphQLStatementsFormatter,
    private apiId: string
  ) {}
  private getAppSyncIntrospectionSchema = async (apiId: string) => {
    const result = await this.appSyncClient.send(
      new GetIntrospectionSchemaCommand({
        apiId,
        format: 'SDL',
      })
    );
    const decoder = new TextDecoder();

    return decoder.decode(result.schema);
  };
  generateDocuments = async () => {
    const appsyncIntrospectionSchema = await this.getAppSyncIntrospectionSchema(
      this.apiId
    );

    const generatedStatements = generateGraphQLDocuments(
      appsyncIntrospectionSchema,
      {
        maxDepth: 3,
        typenameIntrospection: true,
      }
    );
    fs.mkdirSync(this.path, { recursive: true });
    await Promise.all(
      ['queries', 'mutations', 'subscriptions'].map(async (op) => {
        const ops =
          generatedStatements[
            op as unknown as keyof typeof generatedStatements
          ];
        const outputFile = path.resolve(path.join(this.path, `${op}.ts`));
        fs.writeFileSync(outputFile, await this.formatter.format(ops as any));
      })
    );
  };
}
