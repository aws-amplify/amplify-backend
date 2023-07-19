import { CDKSandbox } from './cdk_sandbox.js';
import { Sandbox } from './sandbox.js';

/**
 * Factory to create a new sandbox
 */
class SandboxFactory {
  static createCDKSandbox = () => {
    return new CDKSandbox();
  };
}

export const sandbox: Sandbox = SandboxFactory.createCDKSandbox();
