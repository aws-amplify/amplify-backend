import { execa } from 'execa';
import { PtyProcess } from './process_controller.js';

/**
 * Kills the given process (equivalent of sending CTRL-C)
 * @param processInstance an instance of pty child process
 */
export const killExecaProcess = async (processInstance: PtyProcess) => {
  console.log(`[pid=${processInstance.pid} killExecaProcess]`);
  if (process.platform.startsWith('win')) {
    // Wait X milliseconds before sending kill in hopes of draining the node event queue
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // turns out killing child process on Windows is a huge PITA
    // https://stackoverflow.com/questions/23706055/why-can-i-not-kill-my-child-process-in-nodejs-on-windows
    // https://github.com/sindresorhus/execa#killsignal-options
    // eslint-disable-next-line spellcheck/spell-checker
    await execa('taskkill', ['/pid', `${processInstance.pid}`, '/f', '/t']);
  } else {
    processInstance.kill('SIGINT');
  }
};
