import { Construct } from 'constructs';
import {
  BackendOutputStorageStrategy,
  FunctionResources,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'node:url';

const functionStackType = 'function-Lambda';

/**
 * A base class for function constructs.
 */
export abstract class AmplifyFunctionBase
  extends Construct
  implements ResourceProvider<FunctionResources>, ResourceAccessAcceptorFactory
{
  readonly stack: Stack;
  abstract resources: FunctionResources;

  abstract getResourceAccessAcceptor: () => ResourceAccessAcceptor;

  /**
   * Creates base function construct.
   */
  protected constructor(
    scope: Construct,
    id: string,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {
    super(scope, id);

    this.stack = Stack.of(scope);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      functionStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }

  protected storeOutput = (): void => {
    this.outputStorageStrategy.appendToBackendOutputList(functionOutputKey, {
      version: '1',
      payload: {
        definedFunctions: this.resources.lambda.functionName,
      },
    });
  };
}
