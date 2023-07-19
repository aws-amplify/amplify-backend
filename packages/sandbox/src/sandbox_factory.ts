import { CDKSandbox } from './cdk_sandbox.js';
import { ISandbox } from './sandbox.js';

/**
 * Factory to create a new sandbox
 */
class SandboxFactory {
  static createCDKSandbox = () => {
    return new CDKSandbox();
  };
}

export const sandbox: ISandbox = SandboxFactory.createCDKSandbox();
