import { aws_ssm, CfnElement, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Creates a reference between two stacks using a value in ParameterStore
 * This can be used to eliminate the issue where stack exports / imports require multiple deployments to remove when removing resources
 *
 * deserializer(serializer(value)) should yield an object identical to value
 *
 * If no serializer or deserializer is passed in, JSON.strignify and JSON.parse are used by default
 */
export class AmplifyReference extends Construct {
  private readonly parameterName: string;
  constructor(scope: Construct, name: string, value: string) {
    super(scope, name);

    this.parameterName = `/cdk/${name}-${this.node.addr}`;

    new aws_ssm.StringParameter(this, name, {
      parameterName: this.parameterName,
      stringValue: value,
    });
  }

  getValue(scope: Construct): string {
    scope.node.addDependency(this);
    return aws_ssm.StringParameter.valueForStringParameter(scope, this.parameterName);
  }
}

export class AmplifyStack extends Stack {
  constructor(scope: Construct, private readonly name: string, private readonly envPrefix: string) {
    super(scope, `amp${envPrefix}${name}`);
  }
  public allocateLogicalId(element: CfnElement) {
    const orig = super.allocateLogicalId(element);
    return `amp${this.envPrefix}${orig}`;
  }
}
