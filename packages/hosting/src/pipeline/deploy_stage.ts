// The `DeployStage` construct (a CDK Stage the pipeline populates with stacks)
// now lives in `@aws-blocks/pipeline`. Re-exported here so the pipeline module
// keeps its public API against the shared implementation.
export { DeployStage } from '@aws-blocks/pipeline';
export type { DeployStageProps } from '@aws-blocks/pipeline';
