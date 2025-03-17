import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';
import { data } from './test-assets/destroy_cdk_structured_events.js';
import { AmplifyIOEventsBridgeSingletonFactory } from './amplify_io_events_bridge_singleton_factory.js';

const classUnderTest =
  new AmplifyIOEventsBridgeSingletonFactory().getInstance();
for (const event of data) {
  await classUnderTest.notify(
    event as unknown as AmplifyIoHostEventMessage<unknown>,
  );
  if (
    event.code === 'CDK_TOOLKIT_I0000' &&
    event.message.includes('has an ongoing operation in progress')
  ) {
    // set time out of 500 ms
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else {
    // set time out of 500 ms
    // await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
