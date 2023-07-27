import { CDKSandbox } from './cdk_sandbox.js';
import { Sandbox } from './sandbox.js';

/**
 * Factory to create a new sandbox
 */
export class SandboxFactory {
  static createCDKSandbox = (
    appName: string,
    disambiguator: string
  ): Sandbox => {
    return new CDKSandbox(appName, disambiguator);
  };
}
