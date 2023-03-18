import { AmplifyBuilderBase, TriggerHandler, ResourceDefinition } from '../../manifest/amplify-builder-base';

/**
 * Types and class for Lambda
 */
type LambdaPropsBase = {
  handler: string;
  runtime: string;
  codePath: string;
};
type LambdaProps = ResourceDefinition<LambdaPropsBase, undefined, 'lambdaRuntime'>;
type LambdaActions = 'invoke';
export class AmplifyLambda extends AmplifyBuilderBase<LambdaProps, LambdaActions> implements TriggerHandler {
  _eventHandler: true;
  constructor(public readonly props: LambdaProps) {
    super('@aws-amplify/function-provider');
  }

  triggerHandler() {
    return {
      _refType: 'trigger' as const,
      id: this.id,
    };
  }
}
export const Function = (props: LambdaProps) => new AmplifyLambda(props);
