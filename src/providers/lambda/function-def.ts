import { AmplifyConfigBase, EventHandler, ResourceDefinition } from '../../manifest/imperative-types';

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
export class AmplifyLambda extends AmplifyConfigBase<LambdaProps, LambdaActions> implements EventHandler {
  _eventHandler: true;
  constructor(public readonly props: LambdaProps) {
    super('@aws-amplify/function-provider');
  }

  // eventHandler() {
  //   return {
  //     _eventHandler: true as true,
  //     id: this.id,
  //   };
  // }
}
export const Function = (props: LambdaProps) => new AmplifyLambda(props);
