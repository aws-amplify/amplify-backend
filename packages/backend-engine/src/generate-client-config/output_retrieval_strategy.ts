import {
  CloudFormationClient,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
  Output,
} from '@aws-sdk/client-cloudformation';
import { AmplifyBackendOutput } from '@aws-amplify/backend-types/lib/amplify_backend_output.js';
import { BackendStackResolver } from '@aws-amplify/backend-types';
import { SSMClient } from '@aws-sdk/client-ssm';
import { stackMetadataSchema } from '../backend-metadata/stack_metadata.js';

/**
 * Interface for classes that can fetch outputs for an Amplify backend
 */
export type OutputRetrievalStrategy = {
  /**
   * Get all the output associated with the backend
   */
  fetchAllOutputs(): Promise<AmplifyBackendOutput>;
};

/**
 * Gets Amplify backend outputs from stack metadata and outputs
 */
export class StackMetadataOutputRetrievalStrategy
  implements OutputRetrievalStrategy
{
  /**
   * Instantiate with a CloudFormationClient and a StackNameResolver
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly ssmClient: SSMClient,
    private readonly stackNameResolver: BackendStackResolver
  ) {}

  /**
   * Resolves the stackName, then queries CFN for the stack metadata and outputs
   *
   * It combines the metadata and outputs to reconstruct the data object that was provided by the Amplify constructs when writing the output.
   * Except now the data contains the resolved values of the deployed resources rather than CFN references
   */
  async fetchAllOutputs(): Promise<AmplifyBackendOutput> {
    const stackName = await this.stackNameResolver.resolveStackName(
      this.ssmClient
    );

    // GetTemplateSummary includes the template metadata as a string
    const templateSummary = await this.cfnClient.send(
      new GetTemplateSummaryCommand({ StackName: stackName })
    );
    if (typeof templateSummary.Metadata !== 'string') {
      throw new Error('Stack template metadata is not a string');
    }

    // parse and validate the stack metadata
    const metadata = stackMetadataSchema.parse(
      JSON.parse(templateSummary.Metadata)
    );

    // DescribeStacks includes the template output
    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const outputs = stackDescription?.Stacks?.[0]?.Outputs;
    if (outputs === undefined) {
      throw new Error('Stack outputs are undefined');
    }

    // outputs is a list of output entries. here we turn that into a Record<name, value> object
    const outputRecord = outputs
      .filter((output) => !!output.OutputValue && !!output.OutputKey)
      .reduce(
        (accumulator, outputEntry: Required<Output>) => ({
          ...accumulator,
          [outputEntry.OutputKey]: outputEntry.OutputValue,
        }),
        {} as Record<string, string>
      );

    // now we iterate over the metadata entries and reconstruct the data object based on the stackOutputs that each construct package set
    const result: AmplifyBackendOutput = {};
    Object.entries(metadata).forEach(([constructPackageName, entry]) => {
      const constructData = entry.stackOutputs.reduce(
        (accumulator, outputName) => ({
          ...accumulator,
          [outputName]: outputRecord[outputName],
        }),
        {} as Record<string, string>
      );
      result[constructPackageName] = {
        constructVersion: entry.constructVersion,
        data: constructData,
      };
    });
    return result;
  }
}
