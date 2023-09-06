import {
  AmplifyUIBuilder,
  StartCodegenJobCommandInput,
  StartCodegenJobCommandOutput,
} from '@aws-sdk/client-amplifyuibuilder';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { CodegenJobHandler } from './codegen_job_handler.js';
const createJob = () => ({
  appId: 'fake',
  codegenJobToCreate: {},
  environmentName: 'fakeenv',
});
const createGetJobResponse = ({
  status = 'succeeded',
  downloadUrl = 'https://example.com',
}: { status?: 'succeeded' | 'failed'; downloadUrl?: string } = {}) => {
  return {
    job: {
      status: status,
      asset: {
        downloadUrl,
      },
    },
  };
};

const createStartJobOutput = ({
  id = 'testJob',
}: {
  id?: string;
} = {}): StartCodegenJobCommandOutput => {
  return {
    entity: {
      id,
    },
  } as unknown as StartCodegenJobCommandOutput;
};
describe('CodegenJobHandler', () => {
  it('sends a start job', async () => {
    const startJobMock = mock.fn<AmplifyUIBuilder['startCodegenJob']>(() =>
      Promise.resolve({
        entity: {
          id: 'fake job id',
        },
      } as unknown as Promise<StartCodegenJobCommandOutput>)
    );
    const uiClient = {
      startCodegenJob: startJobMock,
      getCodegenJob: mock.fn(() =>
        Promise.resolve(
          createGetJobResponse({
            status: 'succeeded',
          })
        )
      ),
    } as unknown as AmplifyUIBuilder;
    const handler = new CodegenJobHandler(uiClient);
    const exampleJob = {
      appId: 'fake',
      codegenJobToCreate: {},
      environmentName: 'fakeenv',
    };
    await handler.execute(exampleJob as StartCodegenJobCommandInput);
    assert.deepEqual(exampleJob, startJobMock.mock.calls[0].arguments[0]);
  });
  it('if get job does not return a job id, a type error should be thrown', async () => {
    const startJobMock = mock.fn<AmplifyUIBuilder['startCodegenJob']>(() =>
      Promise.resolve(createStartJobOutput({ id: '' }))
    );
    const uiClient = {
      startCodegenJob: startJobMock,
      getCodegenJob: mock.fn(() =>
        Promise.resolve(createGetJobResponse({ status: 'succeeded' }))
      ),
    } as unknown as AmplifyUIBuilder;
    const handler = new CodegenJobHandler(uiClient);
    const exampleJob = createJob();
    await assert.rejects(
      () => handler.execute(exampleJob as StartCodegenJobCommandInput),
      new TypeError('job id is null')
    );
    assert.deepEqual(exampleJob, startJobMock.mock.calls[0].arguments[0]);
  });
});
