import { App, aws_ssm, CfnElement, Stack } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function, InlineCode, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export const crossStackTest = (app: App): App => {
  const stackA = new Stack(app, "stackA");
  const bucket = new Bucket(stackA, "cross-stack-bucket");
  const bucketRef = new AmplifyReference<string>(
    stackA,
    "bucket-ref",
    bucket.bucketArn
  );

  const stackB = new Stack(app, "stackB");
  const lambda = new Function(stackB, "cross-stack-lambda", {
    runtime: Runtime.NODEJS_16_X,
    handler: "index.handle",
    code: new InlineCode("garbage"),
  });
  lambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
      resources: [bucketRef.getValue(lambda)],
    })
  );
  return app;
};

/**
 * Creates a reference between two stacks using a value in ParameterStore
 * This can be used to eliminate the issue where stack exports / imports require multiple deployments to remove when removing resources
 *
 * deserializer(serializer(value)) should yield an object identical to value
 *
 * If no serializer or deserializer is passed in, JSON.strignify and JSON.parse are used by default
 */
export class AmplifyReference<T> extends Construct {
  private readonly parameterName: string;
  constructor(
    scope: Construct,
    name: string,
    value: unknown,
    serializer = JSON.stringify,
    private readonly deserializer = JSON.parse
  ) {
    super(scope, name);

    this.parameterName = `/cdk/${name}-${this.node.addr}`;

    new aws_ssm.StringParameter(this, name, {
      parameterName: this.parameterName,
      stringValue: serializer(value),
    });
  }

  getValue(scope: Construct): T {
    scope.node.addDependency(this);
    return this.deserializer(
      aws_ssm.StringParameter.valueForStringParameter(scope, this.parameterName)
    ) as T;
  }
}

export class AmplifyStack extends Stack {
  constructor(
    scope: Construct,
    private readonly name: string,
    private readonly envPrefix: string
  ) {
    super(scope, `amp${envPrefix}${name}`);
  }
  public allocateLogicalId(element: CfnElement) {
    const orig = super.allocateLogicalId(element);
    return `amp${this.envPrefix}${orig}`;
  }
}
