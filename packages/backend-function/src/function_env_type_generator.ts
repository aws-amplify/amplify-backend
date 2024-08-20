import fs from 'fs';
import { staticEnvironmentVariables } from './static_env_types.js';
import path from 'path';
import { EOL } from 'os';

/**
 * Generates a typed process.env shim for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  private readonly header =
    '// This file is auto-generated by Amplify. Edits will be overwritten.';

  // The variable gets updated when the fully typed file is updated.
  private readonly envAssignment = 'export const env = process.env';

  private typeDefFilePath: string;

  private indentation: string = '  ';

  /**
   * Initialize typed process.env shim file name and location
   */
  constructor(private readonly functionName: string) {
    this.typeDefFilePath = `${process.cwd()}/.amplify/generated/env/${
      this.functionName
    }.ts`;
  }

  /**
   * Generate a typed process.env shim
   */
  generateTypedProcessEnvShim(amplifyBackendEnvVars: string[]) {
    const lambdaEnvVarTypeName = 'LambdaProvidedEnvVars';
    const amplifyBackendEnvVarTypeName = 'AmplifyBackendEnvVars';

    const declarations = [];

    // Add Lambda runtime environment variables to the typed shim
    declarations.push(
      `/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */`
    );
    declarations.push(`type ${lambdaEnvVarTypeName} = {`);
    for (const key in staticEnvironmentVariables) {
      const comment = `${this.indentation}/** ${staticEnvironmentVariables[key]} */`;
      const declaration = `${this.indentation}${key}: string;`;

      declarations.push(comment + EOL + declaration + EOL);
    }
    declarations.push(`};${EOL}`);

    /**
     * Add Amplify backend environment variables to the typed shim which can be either of the following:
     * 1. Defined by the customer passing env vars to the environment parameter for defineFunction
     * 2. Defined by resource access mechanisms
     */
    declarations.push(
      `/** Amplify backend environment variables available at runtime, this includes environment variables defined in \`defineFunction\` and by cross resource mechanisms */`
    );
    declarations.push(`type ${amplifyBackendEnvVarTypeName} = {`);
    amplifyBackendEnvVars.forEach((envName) => {
      const declaration = `${this.indentation}${envName}: string;`;

      declarations.push(declaration);
    });
    declarations.push(`};${EOL}`);

    const content = `${this.header}${EOL}${
      this.envAssignment
    } as ${lambdaEnvVarTypeName} & ${amplifyBackendEnvVarTypeName};${EOL}${EOL}${declarations.join(
      EOL
    )}`;

    this.writeShimFile(content);
  }

  /**
   * Generate an any-typed process.env shim if doesn't exist
   */
  generateProcessEnvShim = () => {
    // Create an "any" typed variable while creating the initial file to keep TSC happy
    // in case the synth fails and doesn't generate the typed shim.
    // We run TSC regardless after the synth to show more relevant TS errors and this prevents showing env related type errors.
    const content = `${this.header}${EOL}${this.envAssignment} as any;`;
    this.writeShimFile(content);
  };

  private writeShimFile = (content: string) => {
    const typeDefFileDirname = path.dirname(this.typeDefFilePath);

    if (!fs.existsSync(typeDefFileDirname)) {
      fs.mkdirSync(typeDefFileDirname, { recursive: true });
    }

    fs.writeFileSync(this.typeDefFilePath, content);
  };
}