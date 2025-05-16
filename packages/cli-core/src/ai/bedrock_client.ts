/* eslint-disable spellcheck/spell-checker */
/* eslint-disable no-console */
import { pipeline } from '@xenova/transformers';
import lancedb from '@lancedb/lancedb';
import fs from 'fs/promises';
import path, { dirname } from 'path';
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { randomUUID } from 'crypto';
import { BackendLocator } from '@aws-amplify/platform-core';

const sessionID = randomUUID();
/**
 * TBD
 */
export const askAI = async (message: string) => {
  const bedrockAgentClient = new BedrockAgentRuntimeClient();

  const codebase = await compileTypeScriptFiles(
    dirname(new BackendLocator().locate()),
  );
  const context = codebase
    .map((file) => `File: ${file.name}\nCode:${file.content}`)
    .join('\n\n---\n\n');

  message += `\nFull Amplify Gen2 application:
  ${context}`;

  const invokeAgentCommand = new InvokeAgentCommand({
    agentAliasId: 'CM4CCXA47A',
    sessionId: sessionID,
    agentId: 'FKXLDWRVIP',
    inputText: message,
  });
  try {
    const response = await bedrockAgentClient.send(invokeAgentCommand);
    return await getTextFromChunks(response.completion);
  } catch (apiError) {
    console.error('Error calling Amazon Bedrock:', apiError);
    return '';
  }
};
/**
 * TBD
 */
export const handleErrorWithAI = async (error: Error) => {
  const errorContext = `
  Error Message: ${error.message || error}
  Stack Trace: ${error.stack || 'No stack trace available.'}
  `;

  const prompt = `
  Error Context:
  ${errorContext}
  `;
  return askAI(prompt);
};

const getTextFromChunks = async (
  chunks: AsyncIterable<ResponseStream> | undefined,
) => {
  let textResponse = '';
  if (!chunks) return textResponse;
  // Combine all chunks to get the complete text response
  for await (const chunk of chunks) {
    if (chunk.chunk && chunk.chunk.bytes) {
      // Convert bytes to text
      const decoder = new TextDecoder();
      const text = decoder.decode(chunk.chunk.bytes);
      textResponse += text;
    }
  }

  return textResponse;
};

/**
 * TBD
 */
export const getRelevantCodeSnippets = async (
  query: string | string[],
  topK = 10,
) => {
  const db = await lancedb.connect('./lancedb');
  const table = await db.openTable('code_embeddings');
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
  const queryEmbedding = await embedder('amplify', {
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
type FileInfo = {
  name: string;
  content: string;
};

const compileTypeScriptFiles = async (
  directoryPath: string,
  baseDir?: string,
): Promise<FileInfo[]> => {
  // If baseDir is not provided, use directoryPath as the base for relative paths
  const basePath = baseDir || directoryPath;
  const results: FileInfo[] = [];

  // Read all files and directories in the given directory
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      results.push(...(await compileTypeScriptFiles(fullPath, basePath)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      // Process TypeScript files
      try {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf8');

        // Calculate relative path from base directory
        const relativePath = path.relative(basePath, fullPath);

        // Add file info to results
        results.push({
          name: relativePath,
          content: content,
        });
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }

  return results;
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
