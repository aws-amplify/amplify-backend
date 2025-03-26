import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { workerData } from 'worker_threads';

/**
 * Function to compile TypeScript project using Compiler API
 */
export const compileProject = (projectDirectory: string) => {
  // Resolve the path to the tsconfig.json
  const configPath = path.resolve(projectDirectory, 'tsconfig.json');
  if (!fs.existsSync(configPath)) {
    return; // Not a typescript project, turn off TS compilation
  }

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
    throw new AmplifyUserError('SyntaxError', {
      message: 'TypeScript validation check failed.',
      resolution: 'Fix the syntax and type errors in your backend definition.',
      details: ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      }),
    });
  }
};

// If the request comes from a parent, execute it right away
if (workerData?.projectDirectory) {
  compileProject(workerData.projectDirectory);
}
