import { NoticesCommand } from './notices_command.js';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesListCommand } from './notices_list_command.js';
import { NoticesAcknowledgeCommand } from './notices_acknowledge_command.js';
import { PackageManagerControllerFactory } from '@aws-amplify/cli-core';
import { NoticesPrinter } from '../../notices/notices_printer.js';

/**
 * Creates Notices command.
 */
export const createNoticesCommand = (): NoticesCommand => {
  const packageManagerController =
    new PackageManagerControllerFactory().getPackageManagerController();
  const noticesController = new NoticesController();
  const noticesPrinter = new NoticesPrinter(packageManagerController);
  return new NoticesCommand(
    new NoticesListCommand(noticesController, noticesPrinter),
    new NoticesAcknowledgeCommand(noticesController)
  );
};
