import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import os from 'os';

/**
 * Generates a typed process.env shim for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private typeDefFilePath: string;

  /**
   * Initialize typed process.env shim file name and location
   */
  constructor(
    functionName: string,
    private functionEnvironmentVariables: string[]
  ) {
    this.typeDefFilePath = `${process.cwd()}/.amplify/function-env/${functionName}.ts`;
  }

  /**
   * Generate a typed process.env shim
   */
  generateTypedProcessEnvShim() {
    const lambdaEnvVarTypeName = 'LambdaProvidedEnvVars';
    const definedEnvVarTypeName = 'DefinedEnvVars';
    const declarations = [];
    const typeDefFileDirname = path.dirname(this.typeDefFilePath);

    if (!fs.existsSync(typeDefFileDirname)) {
      fs.mkdirSync(typeDefFileDirname, { recursive: true });
    }

    // Add Lambda runtime environment variables
    declarations.push(`type ${lambdaEnvVarTypeName} = {${os.EOL}`);
    for (const key in staticEnvironmentVariables) {
      const comment = `/** ${staticEnvironmentVariables[key]} */`;
      const declaration = `${key}: string;`;

      declarations.push(comment + os.EOL + declaration + os.EOL + os.EOL);
    }
    declarations.push(`};${os.EOL + os.EOL}`);

    // Add defined environment variables
    declarations.push(`type ${definedEnvVarTypeName} = {${os.EOL}`);
    this.functionEnvironmentVariables.forEach((envName) => {
      const declaration = `${envName}: string;`;

      declarations.push(declaration + os.EOL);
    });
    declarations.push(`};${os.EOL + os.EOL}`);

    const content =
      `/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */${os.EOL}` +
      `export const env = process.env as ${
        lambdaEnvVarTypeName + ' & ' + definedEnvVarTypeName
      };${os.EOL + os.EOL}` +
      declarations.join('');

    fs.writeFileSync(this.typeDefFilePath, content);
  }
}
