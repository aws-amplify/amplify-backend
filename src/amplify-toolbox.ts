import "reflect-metadata";
import { program } from "commander";
import { getCommand as linkCommand } from "./commands/link";
import { getCommand as pushCommand } from "./commands/push";
import { getCommand as statusCommand } from "./commands/status";
import { getCommand as synthCommand } from "./commands/synth";
import { getCommand as watchCommand } from "./commands/watch";

/**
 * This is the "new CLI" entry point
 *
 * It has a registry of different commands and delegates to the appropriate one based on the command line args
 */
export const main = async () => {
  program.name("nxt").description("CLI utility for working with Amplify projects").version("0.1.0");

  // TOOD should this be resolved / discovered at runtime?
  // this would allow different commands to be released / versioned independently of the platform
  const commandRegistry = [linkCommand(), pushCommand(), watchCommand(), statusCommand(), synthCommand()];

  commandRegistry.forEach((command) => program.addCommand(command));
  await program.parseAsync();
};
