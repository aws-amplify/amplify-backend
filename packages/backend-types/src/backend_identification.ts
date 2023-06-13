import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

export type StackIdentifier = {
  stackName: string;
};

export type ProjectEnvironmentIdentifier = {
  projectName: string;
  environmentName: string;
};

export type BackendIdentifier = StackIdentifier | ProjectEnvironmentIdentifier;

export type BackendStackCreator = {
  createStack(scope: Construct): Stack;
};

export type BackendStackResolver = {
  resolveStackName(): Promise<string>;
};
