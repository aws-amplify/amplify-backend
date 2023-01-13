import { Construct } from "constructs";
import { AmplifyCdkType, AmplifyConstruct, AmplifyResourceTransform, AmplifyResourceTransformFactory } from "../types";
import { DynamoConstruct } from "./dynamo-construct";

export const getAmplifyResourceTransform: AmplifyResourceTransformFactory = (awsCdkLib, logger, metrics) => {
  return new DynamoResourceTransform(awsCdkLib);
};

export class DynamoResourceTransform implements AmplifyResourceTransform {
  constructor(private readonly awsCdkLib: AmplifyCdkType) {}
  getConstruct(scope: Construct, name: string): AmplifyConstruct<object> {
    return new DynamoConstruct(scope, name, this.awsCdkLib);
  }
}
