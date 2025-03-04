import { NoticesCommand } from './notices_command.js';
import { NoticesController } from '../../notices/notices_controller.js';

/**
 * Creates Notices command.
 */
export const createNoticesCommand = (): NoticesCommand => {
  return new NoticesCommand(new NoticesController());
};
