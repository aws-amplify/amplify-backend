import {
  AmplifyUIBuilder,
  CodegenJob,
  StartCodegenJobCommandInput,
} from '@aws-sdk/client-amplifyuibuilder';

/**
 * Manages the lifecycle of the codegen job
 */
export class CodegenJobHandler {
  /**
   * Instantiates the CodegenJobHandler
   */
  constructor(private uiClient: AmplifyUIBuilder) {}

  execute = async (codegenJob: StartCodegenJobCommandInput) => {
    const response = await this.uiClient.startCodegenJob(codegenJob);
    const jobId = response.entity?.id;
    if (!jobId) {
      throw new TypeError('job id is null');
    }
    const finished = await this.waitForSucceededJob(
      async () => {
        const { job } = await this.uiClient.getCodegenJob({
          appId: codegenJob.appId,
          environmentName: codegenJob.environmentName,
          id: jobId,
        });
        if (!job) throw Error('job is not defined');
        return job;
      },
      {
        pollInterval: 2000,
      }
    );
    if (!finished.asset?.downloadUrl) {
      throw new Error('did not get download url');
    }
    return finished.asset?.downloadUrl;
  };

  private waitForSucceededJob = async (
    getJob: () => Promise<CodegenJob>,
    { pollInterval }: { pollInterval: number }
  ) => {
    const startTime = performance.now();
    const waitTimeout = 1000 * 2;

    const endTime = startTime + waitTimeout;

    while (performance.now() < endTime) {
      const job = await getJob();

      if (!job) {
        throw new Error('Codegen job not found');
      }

      if (job.status === 'failed') {
        throw new Error(job.statusMessage);
      }

      if (job.status === 'succeeded') {
        return job;
      }

      await this.delay(pollInterval);
    }

    if (performance.now() > endTime) {
      throw new Error(`Codegen job never succeeded before timeout`);
    }

    throw new Error('Failed to return codegen job');
  };
  private delay = (durationMs: number): Promise<void> => {
    return new Promise((r) => setTimeout(() => r(), durationMs));
  };
}
