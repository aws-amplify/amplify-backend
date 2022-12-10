import { IAmplifyLogger } from "./types";

export class ConsoleLogger implements IAmplifyLogger {
  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  info(message: string): void {
    console.info(message);
  }

  debug(message: string): void {
    console.debug(message);
  }

  trace(message: string): void {
    console.trace(message);
  }
}

export const consoleLogger = new ConsoleLogger();
