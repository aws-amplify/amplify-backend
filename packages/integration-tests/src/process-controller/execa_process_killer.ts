import { ExecaChildProcess, execa } from 'execa';

/**
 * Kills the given process (equivalent of sending CTRL-C)
 * @param processInstance an instance of execa child process
 */
export const killExecaProcess = async (processInstance: ExecaChildProcess) => {
  if (process.platform.startsWith('win')) {
    if (typeof processInstance.pid !== 'number') {
      throw new Error('Cannot kill the process that does not have pid');
    }
    // Wait X milliseconds before sending kill in hopes of draining the node event queue
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // turns out killing child process on Windows is a huge PITA
    // https://stackoverflow.com/questions/23706055/why-can-i-not-kill-my-child-process-in-nodejs-on-windows
    // https://github.com/sindresorhus/execa#killsignal-options
    try {
      // eslint-disable-next-line spellcheck/spell-checker
      await execa('taskkill', ['/pid', `${processInstance.pid}`, '/f', '/t']);
    } catch (e) {
      // if process doesn't exist it means that it managed to exit gracefully by now.
      // so don't fail in that case.
      const isProcessNotFoundError =
        e instanceof Error &&
        (e.message.includes('not found') ||
          e.message.includes('There is no running instance of the task'));
      if (!isProcessNotFoundError) {
        throw e;
      }
    }
  } else {
    processInstance.kill('SIGINT');
  }
};
