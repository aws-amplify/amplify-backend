import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import os from 'os';
import { FunctionProps } from './factory.js';

/**
 * Generates a type definition file for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private typeDefFilePath: string;
  private dynamicEnvironmentVariables: string[] = [];

  /**
   * Initialize type definition file name and location
   */
  constructor(
    functionName: string,
    functionEnvironmentVariables: FunctionProps['environment']
  ) {
    this.typeDefFilePath = `${process.cwd()}/.amplify/function-env/${functionName}.ts`;

    for (const envName in functionEnvironmentVariables) {
      this.dynamicEnvironmentVariables.push(envName);
    }
  }

  /**
   * Generate a type definition file
   */
  generateTypeDefFile() {
    const declarations = [];
    const typeDefFileDirname = path.dirname(this.typeDefFilePath);

    if (!fs.existsSync(typeDefFileDirname)) {
      fs.mkdirSync(typeDefFileDirname, { recursive: true });
    }

    for (const key in staticEnvironmentVariables) {
      const comment = `/** ${staticEnvironmentVariables[key]} */`;
      const declaration = `${key}: string;`;

      declarations.push(comment + os.EOL + declaration);
    }

    this.dynamicEnvironmentVariables.forEach((envName) => {
      const declaration = `${envName}: string;`;

      declarations.push(declaration);
    });

    const content =
      `/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */${os.EOL}` +
      `export const env = process.env as {${os.EOL}` +
      declarations.join(os.EOL + os.EOL) +
      `${os.EOL}};`;

    fs.writeFileSync(this.typeDefFilePath, content);
  }
}
