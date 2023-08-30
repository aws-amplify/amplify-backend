import {
  AmplifyUIBuilder,
  CodegenJob,
  StartCodegenJobCommandInput,
} from '@aws-sdk/client-amplifyuibuilder';

export class CodegenJobHandler {
  /**
   *
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
      },
    );
    if (!finished.asset?.downloadUrl) {
      throw new Error('did not get download url');
    }
    return finished.asset?.downloadUrl;
  };

  waitForSucceededJob = async (
    getJob: () => Promise<CodegenJob>,
    { pollInterval }: { pollInterval: number },
  ) => {
    const startTime = performance.now();
    const waitTimeout = process.env.UI_BUILDER_CODEGENJOB_TIMEOUT
      ? parseInt(process.env.UI_BUILDER_CODEGENJOB_TIMEOUT)
      : 1000 * 60 * 2;

    const endTime = startTime + waitTimeout;

    while (performance.now() < endTime) {
      const job = await getJob();

      if (!job) {
        throw new Error('Codegen job not found');
      }

      if (job.status === 'failed') {
        console.error('Codegen job status is failed', {
          message: job.statusMessage,
        });
        throw new Error(job.statusMessage);
      }

      if (job.status === 'succeeded') {
        console.debug(`Polling time: ${performance.now() - startTime}`);

        return job;
      }

      await this.delay(pollInterval);
    }

    if (performance.now() > endTime) {
      console.error(`Codegen job never succeeded before timeout`);
    }

    throw new Error('Failed to return codegen job');
  };
}
