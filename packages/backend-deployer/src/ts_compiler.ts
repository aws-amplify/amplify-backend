import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { workerData } from 'worker_threads';

/**
 * The type-check relies on the TypeScript JavaScript Compiler API (ts.sys,
 * ts.readConfigFile, ts.createIncrementalProgram, ...). TypeScript 7.0 (the Go
 * rewrite) does not ship that API, so these members are undefined and calling
 * into them throws an opaque "Cannot read properties of undefined (reading
 * 'readFile')". Detect that up front and surface an actionable error instead of
 * a worker crash. Accepts the ts module as a parameter so it can be unit-tested
 * without mutating the real (non-configurable) typescript namespace object.
 */
export const assertTypeScriptCompilerApi = (tsModule: typeof ts = ts) => {
  const missingApiMembers = [
    !tsModule.sys && 'ts.sys',
    typeof tsModule.readConfigFile !== 'function' && 'ts.readConfigFile',
  ].filter((member): member is string => typeof member === 'string');
  if (missingApiMembers.length > 0) {
    throw new AmplifyUserError('TypeScriptCompilerApiUnavailableError', {
      message: `The installed 'typescript' does not expose the JavaScript Compiler API required to type-check your backend (missing: ${missingApiMembers.join(
        ', ',
      )}).`,
      resolution:
        "Use a TypeScript 5.x release for your project's 'typescript' dependency. TypeScript 7.0 (the Go rewrite) removed the JavaScript Compiler API; it is expected to return in a later release.",
    });
  }
};

/**
 * Function to compile TypeScript project using Compiler API
 */
export const compileProject = (projectDirectory: string) => {
  // Resolve the path to the tsconfig.json
  const configPath = path.resolve(projectDirectory, 'tsconfig.json');
  if (!fs.existsSync(configPath)) {
    return; // Not a typescript project, turn off TS compilation
  }

  assertTypeScriptCompilerApi(ts);

  // Read and parse tsconfig.json
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new AmplifyUserError('SyntaxError', {
      message: 'Failed to parse tsconfig.json.',
      resolution: 'Fix the syntax and type errors in your tsconfig.json file.',
      details: ts.formatDiagnostic(configFile.error, ts.createCompilerHost({})),
    });
  }

  // Parse JSON config into a TypeScript compiler options object
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectDirectory,
  );

  const tsBuildInfoFile = path.resolve(
    projectDirectory,
    '..',
    '.amplify',
    'tsconfig.tsbuildinfo',
  );
  // Modify compiler options to match the command line options
  parsedCommandLine.options.skipLibCheck = true;
  parsedCommandLine.options.noEmit = true;
  parsedCommandLine.options.incremental = true;
  parsedCommandLine.options.tsBuildInfoFile = tsBuildInfoFile;

  const host = ts.createIncrementalCompilerHost(parsedCommandLine.options);
  let oldCachedProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;
  // Cache exists, let's use it
  if (fs.existsSync(tsBuildInfoFile)) {
    oldCachedProgram = ts.readBuilderProgram(parsedCommandLine.options, host);
  }

  const tsProgram = oldCachedProgram
    ? ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        parsedCommandLine.fileNames,
        parsedCommandLine.options,
        host,
        oldCachedProgram,
      )
    : ts.createIncrementalProgram({
        options: parsedCommandLine.options,
        rootNames: parsedCommandLine.fileNames,
        host,
      });

  // Have to call emit to generate the tsBuildInfo, it won't generate .js or .d.ts since noEmit is true
  tsProgram.emit();
  const diagnostics = ts.getPreEmitDiagnostics(tsProgram.getProgram());

  // Report any errors
  if (diagnostics.length > 0) {
    const tsFormattedError = ts.formatDiagnosticsWithColorAndContext(
      diagnostics,
      {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      },
    );
    if (diagnostics.length === 1 && diagnostics[0].code === 2307) {
      // if the only TS error is function env var not present, then throw a more specific error
      const errorMessage =
        typeof diagnostics[0].messageText === 'string'
          ? diagnostics[0].messageText
          : diagnostics[0].messageText.messageText;
      if (
        errorMessage.match(
          /Cannot find module '\$amplify\/env\/.*' or its corresponding type declarations/,
        )
      ) {
        throw new AmplifyUserError('FunctionEnvVarFileNotGeneratedError', {
          message: 'Function environment variable files are not generated',
          resolution:
            'Fix the syntax and type errors in your backend definition.',
          details: tsFormattedError,
        });
      }
    }
    throw new AmplifyUserError('SyntaxError', {
      message: 'TypeScript validation check failed.',
      resolution: 'Fix the syntax and type errors in your backend definition.',
      details: tsFormattedError,
    });
  }
};

// If the request comes from a parent, execute it right away
if (workerData?.projectDirectory) {
  compileProject(workerData.projectDirectory);
}
