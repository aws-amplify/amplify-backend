import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import { EOL } from 'os';

/**
 * Generates a typed process.env shim for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private typeDefFilePath: string;

  /**
   * Initialize typed process.env shim file name and location
   */
  constructor(
    private readonly functionName: string,
    private readonly amplifyBackendEnvVars: string[] = []
  ) {
    this.typeDefFilePath = `${process.cwd()}/.amplify/function-env/${
      this.functionName
    }.ts`;
  }

  /**
   * Generate a typed process.env shim
   */
  generateTypedProcessEnvShim() {
    const lambdaEnvVarTypeName = 'LambdaProvidedEnvVars';
    const amplifyBackendEnvVarTypeName = 'AmplifyBackendEnvVars';

    const declarations = [];
    const typeDefFileDirname = path.dirname(this.typeDefFilePath);

    if (!fs.existsSync(typeDefFileDirname)) {
      fs.mkdirSync(typeDefFileDirname, { recursive: true });
    }

    // Add Lambda runtime environment variables to the typed shim
    declarations.push(`type ${lambdaEnvVarTypeName} = {`);
    for (const key in staticEnvironmentVariables) {
      const comment = `/** ${staticEnvironmentVariables[key]} */`;
      const declaration = `${key}: string;`;

      declarations.push(comment + EOL + declaration + EOL);
    }
    declarations.push(`};${EOL}`);

    /**
     * Add Amplify backend environment variables to the typed shim which can be either of the following:
     * 1. Defined by the customer passing env vars to the environment parameter for defineFunction
     * 2. Defined by resource access mechanisms
     */
    declarations.push(`type ${amplifyBackendEnvVarTypeName} = {`);
    this.amplifyBackendEnvVars.forEach((envName) => {
      const declaration = `${envName}: string;`;

      declarations.push(declaration);
    });
    declarations.push(`};${EOL}`);

    const content =
      `/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */${EOL}` +
      `export const env = process.env as ${lambdaEnvVarTypeName} & ${amplifyBackendEnvVarTypeName};${EOL}${EOL}${declarations.join(
        EOL
      )}`;

    fs.writeFileSync(this.typeDefFilePath, content);
  }
}
