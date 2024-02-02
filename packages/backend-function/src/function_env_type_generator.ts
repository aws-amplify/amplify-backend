import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import os from 'os';

/**
 * Generates a type definition file for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private typeDefLocation: string;

  private typeDefFileName: string;

  /**
   * Initialize type definition file name and location
   */
  constructor(functionName: string, functionEntryPath: string) {
    this.typeDefFileName = `${functionName}_env.ts`;
    this.typeDefLocation = path.dirname(functionEntryPath) + '/amplify/';
  }

  /**
   * Generate a type definition file `./amplify/<function-name>_env.ts` as a sibling to the function's entry file
   */
  generateTypeDefFile() {
    const declarations = [];

    if (!fs.existsSync(this.typeDefLocation)) {
      fs.mkdirSync(this.typeDefLocation);
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

    fs.writeFileSync(this.typeDefLocation + this.typeDefFileName, content);
  }
}
