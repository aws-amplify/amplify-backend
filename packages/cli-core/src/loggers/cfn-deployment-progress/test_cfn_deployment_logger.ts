import {
  CfnDeploymentStackEvent,
  CurrentActivityPrinter,
} from './cfn_deployment_logger.js';
import { data } from './test-assets/new_deployment_events.js';

const classUnderTest = new CurrentActivityPrinter({
  resourceTypeColumnWidth: 30,
  getBlockWidth: () => process.stdout.columns,
  getBlockHeight: () => process.stdout.rows,
});
for (const event of data) {
  switch (event.eventId) {
    case 'CDK_TOOLKIT_I0000':
      await classUnderTest.print();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      break;
    case 'CDK_TOOLKIT_I5502':
      classUnderTest.addActivity(
        event.event as unknown as CfnDeploymentStackEvent
      );
      break;
    default:
      break;
  }
}
await classUnderTest.stop();
