import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import ts from 'typescript';
import path from 'path';
import { createExecutableTool } from './executable_tool_factory';
import { ToolResultContentBlock } from './types';

/**
 * This function compiles a TypeScript snippet in memory.
 * Inspired by https://stackoverflow.com/questions/53733138/how-do-i-type-check-a-snippet-of-typescript-code-in-memory
 */
const compileInMemory = (rootDir: string, text: string) => {
  const options = ts.getDefaultCompilerOptions();
  options.strict = true;
  const inMemoryFilePath = path.resolve(path.join(rootDir, '__dummy-file.ts'));
  const textAst = ts.createSourceFile(
    inMemoryFilePath,
    text,
    options.target || ts.ScriptTarget.Latest
  );
  const host = ts.createCompilerHost(options, true);

  const overrideIfInMemoryFile = (
    methodName: 'getSourceFile' | 'readFile' | 'fileExists',
    inMemoryValue: unknown
  ) => {
    // This is intentional, we don't care about function signature, we just
    // want to intercept it.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const originalMethod: Function = host[methodName];
    mock.method(host, methodName, (...args: unknown[]) => {
      // resolve the path because typescript will normalize it
      // to forward slashes on windows
      const filePath = path.resolve(args[0] as string);
      if (filePath === inMemoryFilePath) return inMemoryValue;
      return originalMethod.apply(host, args);
    });
  };

  overrideIfInMemoryFile('getSourceFile', textAst);
  overrideIfInMemoryFile('readFile', text);
  overrideIfInMemoryFile('fileExists', true);

  const program = ts.createProgram({
    options,
    rootNames: [inMemoryFilePath],
    host,
  });

  return ts.getPreEmitDiagnostics(program, textAst);
};

void describe('Executable Tool Factory', () => {
  void it('creates a functional executable tool', async () => {
    const toolName = 'testToolName';
    const toolDescription = 'testToolDescription';
    const inputSchema = {
      type: 'object',
      properties: {
        testProperty: { type: 'string' },
      },
      required: ['testProperty'],
    } as const;
    type TypeMatchingSchema = {
      testProperty: string;
    };
    const tool = createExecutableTool(
      toolName,
      toolDescription,
      { json: inputSchema },
      async (input) => {
        const inputText: string = input.testProperty;
        return {
          text: inputText,
        } satisfies ToolResultContentBlock;
      }
    );
    assert.strictEqual(tool.name, toolName);
    assert.strictEqual(tool.description, toolDescription);
    assert.deepStrictEqual(tool.inputSchema.json, inputSchema);
    const input1: TypeMatchingSchema = {
      testProperty: 'testPropertyValue1',
    };
    const output1 = await tool.execute(input1);
    assert.strictEqual(output1.text, input1.testProperty);
    const input2: TypeMatchingSchema = {
      testProperty: 'testPropertyValue2',
    };
    const output2 = await tool.execute(input2);
    assert.strictEqual(output2.text, input2.testProperty);
  });

  void it('fails compilation if unknown property is used', () => {
    const sourceSnippet = `
      import { createExecutableTool } from './executable_tool_factory';
      import { ToolResultContentBlock } from './types';
      
      const inputSchema = {
        type: 'object',
        properties: {
          testProperty: { type: 'string' },
        },
        required: ['testProperty'],
      } as const;
      
      createExecutableTool(
        'testName',
        'testDescription',
        { json: inputSchema },
        async (input) => {
          // This should trigger compiler as properties not in schema are 'unknown'.
          const someNonExistingPropertyValue: string = input.someNonExistingProperty;
          return {
            text: 'testResultText',
          } satisfies ToolResultContentBlock;
        }
      );
`;

    const diagnostics = compileInMemory(__dirname, sourceSnippet);
    assert.strictEqual(1, diagnostics.length);
    // Properties not in schema are 'unknown'.
    assert.strictEqual(
      diagnostics[0].messageText,
      "Type 'unknown' is not assignable to type 'string'."
    );
  });

  void it('allows overriding input type', () => {
    const sourceSnippet = `
      import { createExecutableTool } from './executable_tool_factory';
      import { ToolResultContentBlock } from './types';
      
      const inputSchema = {
        type: 'object',
        properties: {
          testProperty: { type: 'string' },
        },
        required: ['testProperty'],
      } as const;
      
      type OverrideInputType = {
        someOverriddenProperty: string
      }
      
      createExecutableTool<typeof inputSchema, OverrideInputType>(
        'testName',
        'testDescription',
        { json: inputSchema },
        async (input) => {
          // This should not trigger compiler because type is overridden.
          const someOverriddenPropertyValue: string = input.someOverriddenProperty;
          return {
            text: 'testResultText',
          } satisfies ToolResultContentBlock;
        }
      );
`;

    const diagnostics = compileInMemory(__dirname, sourceSnippet);
    // Assert that compiler is happy.
    assert.strictEqual(0, diagnostics.length);
  });
});
