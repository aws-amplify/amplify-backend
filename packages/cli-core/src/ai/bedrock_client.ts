/* eslint-disable spellcheck/spell-checker */
/* eslint-disable no-console */
// Create a bedrock client that invokes invokeModel
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { pipeline } from '@xenova/transformers';
import lancedb from '@lancedb/lancedb';
import fs from 'fs/promises';
import path from 'path';
/**
 * TBD
 */
export const handleErrorWithAI = async (error: Error) => {
  const bedrockClient = new BedrockRuntimeClient();
  const errorContext = `
  Error Message: ${error.message || error}
  Stack Trace: ${error.stack || 'No stack trace available.'}
  `;
  // Retrieve relevant code snippets based on error message and stack
  const relevantCodeSnippets = await getRelevantCodeSnippets(
    error.stack ?? '',
    10,
  );
  // console.log(relevantCodeSnippets);
  const prompt = `
  You are an expert Node.js developer assisting in debugging an Amplify Gen2 (NOT Amplify Gen 1) application errors.
  You should provide existing issues like if any from
  Amplify Gen2 github repo: https://github.com/aws-amplify/amplify-backend/issues
  Amplify Gen2 documentation: https://docs.amplify.aws/react/build-a-backend/
  Error Context:
  ${errorContext}
  Relevant code snippets from the Amplify Gen2 application:
  ${relevantCodeSnippets.join('\n---\n')}
  Provide a clear analysis of the error, possible root causes, possible links to existing issues and documentations links and recommendations to fix it.
  `;
  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0', // Claude Sonnet model ID
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  try {
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(
      Buffer.from(response.body).toString('utf-8'),
    );
    const aiMessage = responseBody.content[0].text;
    return aiMessage;
  } catch (apiError) {
    console.error('Error calling Amazon Bedrock:', apiError);
    return null;
  }
};

/**
 * TBD
 */
export const getRelevantCodeSnippets = async (
  query: string | string[],
  topK = 5,
) => {
  const db = await lancedb.connect('./lancedb');
  const table = await db.openTable('code_embeddings');
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
  const queryEmbedding = await embedder(query, {
    pooling: 'mean',
    normalize: true,
  });
  const results = await table
    .search(Array.from(queryEmbedding.data))
    .limit(topK)
    .toArray();
  return results.map((result) => ({
    filePath: result.filePath,
    content: result.content,
    distance: result._distance,
  }));
};

/**
 * TBD
 */
export const embedAndStoreCode = async (baseDir = './src') => {
  const db = await lancedb.connect('./lancedb');
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
  // Check if table exists; if not, create it
  const tableNames = await db.tableNames();
  const table = tableNames.includes('code_embeddings')
    ? await db.openTable('code_embeddings')
    : await db.createTable('code_embeddings', [
        {
          vector: Array(384),
          filePath: 'example.js',
          content: 'console.log("example")',
        },
      ]);
  const walkDir = async (dir: string) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walkDir(filePath);
      } else if (/\.(js|ts|jsx|tsx)$/.test(file.name)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const embeddingResult = await embedder(content, {
          pooling: 'mean',
          normalize: true,
        });
        const embedding = Array.from(embeddingResult.data);
        // Corrected: Use exact column name "filePath" (case-sensitive)
        const existing = await table
          .search(embedding)
          .where(`"filePath" = '${filePath}'`)
          .limit(1)
          .toArray();
        if (existing.length > 0) {
          // Delete existing entry
          await table.delete(`"filePath" = '${filePath}'`);
          console.log(`Deleted existing embedding: ${filePath}`);
        }
        // Insert new embedding
        await table.add([{ vector: embedding, filePath, content }]);
        console.log(`Inserted embedding: ${filePath}`);
      }
    }
  };
  await walkDir(baseDir);
  console.log('Embedding and indexing complete.');
};
