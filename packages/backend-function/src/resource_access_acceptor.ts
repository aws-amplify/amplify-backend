import {
  ResourceAccessAcceptor,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import { AmplifyFunctionBase } from './function_construct_base.js';
import { Policy } from 'aws-cdk-lib/aws-iam';

/**
 * A function resource acceptor.
 */
export class FunctionResourceAccessAcceptor implements ResourceAccessAcceptor {
  readonly identifier: string;

  /**
   * Creates function resource acceptor.
   */
  constructor(
    private readonly func: AmplifyFunctionBase,
    private readonly functionEnvironmentTranslator?: FunctionEnvironmentTranslator,
  ) {
    this.identifier = `${func.node.id}LambdaResourceAccessAcceptor`;
  }

  acceptResourceAccess = (
    policy: Policy,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
  ) => {
    const role = this.func.resources.lambda.role;
    if (!role) {
      // This should never happen since we are using the Function L2 construct
      throw new Error(
        'No execution role found to attach lambda permissions to',
      );
    }
    policy.attachToRole(role);
    if (this.functionEnvironmentTranslator) {
      for (const { name, path } of ssmEnvironmentEntries) {
        this.functionEnvironmentTranslator.addSsmEnvironmentEntry(name, path);
      }
    }
  };
}
