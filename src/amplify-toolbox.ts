import "reflect-metadata";
import { program } from "commander";
import { getCommand as linkCommand } from "./commands/amplify-link";
import { getCommand as pushCommand } from "./commands/amplify-push";
import { getCommand as statusCommand } from "./commands/amplify-status";
import { getCommand as synthCommand } from "./commands/amplify-synth";
import { getCommand as watchCommand } from "./commands/amplify-watch";

export const main = async () => {
  program.name("nxt").description("CLI utility for working with Amplify projects").version("0.1.0");

  // TOOD should this be resolved / discovered at runtime
  // this would allow different commands to be released / versioned independently of the platform
  const commandRegistry = [linkCommand(), pushCommand(), watchCommand(), statusCommand(), synthCommand()];

  commandRegistry.forEach((command) => program.addCommand(command));
  await program.parseAsync();
};
