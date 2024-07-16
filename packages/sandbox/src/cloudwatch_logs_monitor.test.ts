import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';

import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilterLogEventsCommandInput,
} from '@aws-sdk/client-cloudwatch-logs';
import { printer } from '@aws-amplify/cli-core';

void describe('LambdaFunctionLogStreamer', () => {
  // Get hold of process.stdout for assertions that logs were streamed
  const mockedWrite = mock.method(printer, 'print');

  const region = 'us-west-2';

  // CW default implementation, return test events for each log group
  const cloudWatchClientMock = new CloudWatchLogsClient({ region });
  const cloudWatchClientSendMock = mock.method(cloudWatchClientMock, 'send');

  let classUnderTest: CloudWatchLogEventMonitor;

  beforeEach(() => {
    classUnderTest = new CloudWatchLogEventMonitor(cloudWatchClientMock);
    mockedWrite.mock.resetCalls();
    cloudWatchClientSendMock.mock.resetCalls();
  });

  void it('starts streaming CW logs for added log groups on stdout', async () => {
    cloudWatchClientSendMock.mock.mockImplementation(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        return Promise.resolve({
          events: [
            {
              message: `text message for ${filterLogEventsCommand.input.logGroupName} some useful text`,
              timestamp: filterLogEventsCommand.input.startTime
                ? filterLogEventsCommand.input.startTime + 1000
                : Date.now(),
            },
            {
              message: `json message for ${
                filterLogEventsCommand.input.logGroupName
              } ${JSON.stringify({ key1: 'value1', key2: 'value2' }, null, 2)}`,
              timestamp: filterLogEventsCommand.input.startTime
                ? filterLogEventsCommand.input.startTime + 1000
                : Date.now(),
            },
          ],
        });
      }
    );
    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.addLogGroups('logFriendlyName2', 'logGroupName2');
    classUnderTest.activate();
    // wait just a bit to let the logs streamer run before deactivating it
    await new Promise((resolve) => setTimeout(resolve, 100));
    classUnderTest.pause();

    assert.strictEqual(mockedWrite.mock.callCount(), 4);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0],
      /logFriendlyName1.* text message for logGroupName1 some useful text/
    );
    assert.match(
      mockedWrite.mock.calls[1].arguments[0],
      /logFriendlyName1.* json message for logGroupName1 {\n {2}"key1": "value1",\n {2}"key2": "value2"\n}/
    );
    assert.match(
      mockedWrite.mock.calls[2].arguments[0],
      /logFriendlyName2.* text message for logGroupName2 some useful text/
    );
    assert.match(
      mockedWrite.mock.calls[3].arguments[0],
      /logFriendlyName2.* json message for logGroupName2 {\n {2}"key1": "value1",\n {2}"key2": "value2"\n}/
    );
  });

  void it('ensures that unmask option is set to fast (default) when calling filterLogEvents API', async () => {
    cloudWatchClientSendMock.mock.mockImplementationOnce(() => {
      return Promise.resolve({
        events: [],
      });
    });
    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.activate();
    // wait just a bit to let the logs streamer run before deactivating it
    await new Promise((resolve) => setTimeout(resolve, 100));
    classUnderTest.pause();

    assert.strictEqual(cloudWatchClientSendMock.mock.calls.length, 1);
    const filterLogEventsCommand = cloudWatchClientSendMock.mock.calls[0]
      .arguments[0] as FilterLogEventsCommandInput;
    assert.ok(!filterLogEventsCommand.unmask); // unmask should be false
  });

  void it('continue to stream CW logs until deactivated', async () => {
    let timestampOfLatestEventInFirstPoll = 0;
    cloudWatchClientSendMock.mock.mockImplementationOnce(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        timestampOfLatestEventInFirstPoll = filterLogEventsCommand.input
          .startTime
          ? filterLogEventsCommand.input.startTime + 1000
          : Date.now();
        return Promise.resolve({
          events: [
            {
              message: `first text message`,
              timestamp: timestampOfLatestEventInFirstPoll,
            },
          ],
        });
      },
      0
    );
    cloudWatchClientSendMock.mock.mockImplementationOnce(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        // assert that the next poll starts after the last event in the first poll + 1;
        assert.strictEqual(
          timestampOfLatestEventInFirstPoll + 1,
          filterLogEventsCommand.input.startTime
        );
        return Promise.resolve({
          events: [
            {
              message: `second text message`,
              timestamp: filterLogEventsCommand.input.startTime
                ? filterLogEventsCommand.input.startTime + 1000
                : Date.now(),
            },
          ],
        });
      },
      1
    );

    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.activate();
    // wait for just over two seconds to let the logs streamer get both the events before deactivating it
    await new Promise((resolve) => setTimeout(resolve, 2100));
    classUnderTest.pause();

    assert.strictEqual(mockedWrite.mock.callCount(), 2);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0],
      /logFriendlyName1.* first text message/
    );
    assert.match(
      mockedWrite.mock.calls[1].arguments[0],
      /logFriendlyName1.* second text message/
    );
  });

  void it('stop streaming logs if an exception happens', async (contextual) => {
    const mockLog = contextual.mock.method(printer, 'log');
    cloudWatchClientSendMock.mock.mockImplementationOnce(() => {
      return Promise.reject(new Error('some cloudWatch error'));
    }, 0);

    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.activate();
    // wait for just over two seconds to let the logs streamer get the first event and ensure it doesn't call CW again
    await new Promise((resolve) => setTimeout(resolve, 2100));
    classUnderTest.pause();

    assert.strictEqual(cloudWatchClientSendMock.mock.callCount(), 1);
    assert.strictEqual(mockLog.mock.callCount(), 2);
    assert.match(
      mockLog.mock.calls[0].arguments[0],
      /Error streaming logs from CloudWatch/
    );
    assert.equal(
      mockLog.mock.calls[1].arguments[0],
      'Logs streaming has been paused.'
    );
  });

  void it('when CloudWatch return 100 results AND a nextToken, asserts that another message is shown to user mentioning that 100 messages limit is hit', async () => {
    let timestampOfLatestEventInFirstPoll = 0;
    cloudWatchClientSendMock.mock.mockImplementationOnce(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        timestampOfLatestEventInFirstPoll = filterLogEventsCommand.input
          .startTime
          ? filterLogEventsCommand.input.startTime + 1000
          : Date.now();
        const events: { message: string; timestamp: number }[] = [];
        Array(100)
          .fill(0)
          .map((_, i) =>
            events.push({
              message: `message number ${i}`,
              timestamp: timestampOfLatestEventInFirstPoll,
            })
          );
        return Promise.resolve({
          events,
          nextToken: 'someToken',
        });
      },
      0
    );

    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.activate();
    // wait just a bit to let the logs streamer run before deactivating it
    await new Promise((resolve) => setTimeout(resolve, 100));
    classUnderTest.pause();

    // 100 events + 1 informational for the user that 100 messages limit is hit
    assert.strictEqual(mockedWrite.mock.callCount(), 101);
    assert.match(
      mockedWrite.mock.calls[100].arguments[0],
      /logFriendlyName1.* >>> `sandbox` shows only the first 100 log messages - the rest have been truncated.../
    );
  });

  void it('resume streaming from the time the deactivate was called', async () => {
    cloudWatchClientSendMock.mock.mockImplementationOnce(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        return Promise.resolve({
          events: [
            {
              message: `first text message`,
              timestamp: filterLogEventsCommand.input.startTime
                ? filterLogEventsCommand.input.startTime + 1000
                : Date.now(),
            },
          ],
        });
      },
      0
    );
    cloudWatchClientSendMock.mock.mockImplementationOnce(
      (filterLogEventsCommand: FilterLogEventsCommand) => {
        return Promise.resolve({
          events: [
            {
              message: `second text message`,
              timestamp: filterLogEventsCommand.input.startTime
                ? filterLogEventsCommand.input.startTime + 1000
                : Date.now(),
            },
          ],
        });
      },
      1
    );

    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    classUnderTest.activate();
    // wait for just a bit to only let the logs streamer get get the first event before deactivating it
    await new Promise((resolve) => setTimeout(resolve, 100));
    classUnderTest.pause();

    // wait for some time before restarting it back
    await new Promise((resolve) => setTimeout(resolve, 3000));
    classUnderTest.addLogGroups('logFriendlyName1', 'logGroupName1');
    // activate it again and it should fetch the second event now
    classUnderTest.activate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    classUnderTest.pause();

    assert.strictEqual(mockedWrite.mock.callCount(), 2);
    assert.match(
      mockedWrite.mock.calls[0].arguments[0],
      /logFriendlyName1.* first text message/
    );
    assert.match(
      mockedWrite.mock.calls[1].arguments[0],
      /logFriendlyName1.* second text message/
    );
  });
});
