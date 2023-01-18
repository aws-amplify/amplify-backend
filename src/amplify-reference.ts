import { aws_ssm, CfnElement, custom_resources, Stack } from "aws-cdk-lib";
import { AwsCustomResource } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/**
 * Creates a reference between two stacks using a value in ParameterStore
 * This can be used to eliminate the issue where stack exports / imports require multiple deployments to remove when removing resources
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

export class SecretRef extends custom_resources.AwsCustomResource {
  constructor(scope: Construct, parameterName: string) {
    super(scope, "secret-fetcher", {
      onUpdate: {
        service: "SSM",
        action: "getParameter",
        parameters: {
          Name: parameterName,
          WithDecryption: true,
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({ resources: ["*"] }),
    });
  }

  getValueRef(): string {
    return this.getResponseField("Parameter.Value");
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
