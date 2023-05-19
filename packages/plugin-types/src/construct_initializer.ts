import { Construct } from 'constructs';

export type ConstructInitializer<Instance extends Construct> = {
  resourceGroupName: string;
  initialize(scope: Construct): Instance;
};
