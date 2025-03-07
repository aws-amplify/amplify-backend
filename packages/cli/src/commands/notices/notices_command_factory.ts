import { NoticesCommand } from './notices_command.js';
import { NoticesController } from '../../notices/notices_controller.js';
import { NoticesListCommand } from './notices_list_command.js';

/**
 * Creates Notices command.
 */
export const createNoticesCommand = (): NoticesCommand => {
  return new NoticesCommand(new NoticesListCommand(new NoticesController()));
};
