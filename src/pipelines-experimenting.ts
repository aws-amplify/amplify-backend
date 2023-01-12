import {
  aws_codestar,
  aws_codestarconnections,
  Stack,
  StackProps,
  Stage,
  StageProps,
} from "aws-cdk-lib";
import {
  CodeBuildStep,
  CodePipeline,
  CodePipelineSource,
  Wave,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { AmplifyTransform } from "./amplify-transform";

class AmplifyStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const amplifyBackend = new AmplifyTransform(
      this,
      id,
      {
        /* manifest goes here */
      },
      {
        /* transformers go here */
      }
    );
  }
}

class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: "AmplifyPipeline",
      synth: new CodeBuildStep("SynthStep", {
        // instructions on setting up CodeStar connection would need to be specified in docs
        // placed to specify repo, branch and connection arn would need to be exposed in manifest
        input: CodePipelineSource.connection(
          "edwardfoyle/testproject",
          "main",
          { connectionArn: "someConnectionArn" }
        ),
        // these parts would need to be exposed in manifest
        // perhaps customer could specify script files and we could parse into these inputs?
        installCommands: ["npm install -g aws-cdk"],
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
    });

    const beta = new AmplifyStage(this, "Beta");
    pipeline.addStage(beta);
    const waveA = pipeline.addWave("WaveA");
    waveA.addStage(beta);
  }
}
