import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import os from 'os';
import { FunctionTypeDefConventionProvider } from '@aws-amplify/platform-core';

/**
 * Generates a type definition file for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private typeDefFilePath: string;

  /**
   * Initialize type definition file name and location
   */
  constructor(functionName: string, functionEntryPath: string) {
    this.typeDefFilePath =
      FunctionTypeDefConventionProvider.getFunctionTypeDefFilePath(
        functionEntryPath,
        functionName
      );
  }

  /**
   * Generate a type definition file as a sibling to the function's entry file
   */
  generateTypeDefFile() {
    const declarations = [];
    const typeDefFileDirname = path.dirname(this.typeDefFilePath);

    if (!fs.existsSync(typeDefFileDirname)) {
      fs.mkdirSync(typeDefFileDirname);
    }

    for (const key in staticEnvironmentVariables) {
      const comment = `/** ${staticEnvironmentVariables[key]} */`;
      const declaration = `${key}: string;`;

      declarations.push(comment + os.EOL + declaration);
    }

    const content =
      `/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */${os.EOL}` +
      `export const env = process.env as {${os.EOL}` +
      declarations.join(os.EOL + os.EOL) +
      `${os.EOL}};`;

    fs.writeFileSync(this.typeDefFilePath, content);
  }
}
