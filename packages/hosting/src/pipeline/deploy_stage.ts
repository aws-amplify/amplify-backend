import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { PipelineStageConfig } from './types.js';

/**
 * Props for the {@link DeployStage} construct.
 */
export type DeployStageProps<TConfig = Record<string, unknown>> = {
  /** The stage configuration (name, env, config, etc.). */
  readonly stageConfig: PipelineStageConfig<TConfig>;
} & cdk.StageProps;

/**
 * A CDK Stage used by the pipeline to represent a deployment environment.
 *
 * The stageFactory populates this Stage with stacks externally (not in
 * the constructor), allowing both sync and async factory patterns.
 */
export class DeployStage<TConfig = Record<string, unknown>> extends cdk.Stage {
  /** Creates a new DeployStage. */
  constructor(scope: Construct, id: string, props: DeployStageProps<TConfig>) {
    super(scope, id, { env: props.stageConfig.env });
  }
}
