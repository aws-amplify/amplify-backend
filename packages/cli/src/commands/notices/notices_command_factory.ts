import { NoticesCommand } from './notices_command.js';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesListCommand } from './notices_list_command.js';
import { NoticesAcknowledgeCommand } from './notices_acknowledge_command.js';

/**
 * Creates Notices command.
 */
export const createNoticesCommand = (): NoticesCommand => {
  const noticesController = new NoticesController();
  return new NoticesCommand(
    new NoticesListCommand(noticesController),
    new NoticesAcknowledgeCommand(noticesController)
  );
};
