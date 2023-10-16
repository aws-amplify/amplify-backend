/**
 * Parses command line arguments and returns an object containing subcommands, options, and flags.
 * @returns subcommands, options, flags
 */
export const getArgs = () => {
  const args = process.argv.slice(2); // Remove the first two elements (node and script path)
  const subcommands = [];
  const options = [];
  const flags = [];

  let currentSubcommand = null;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        // It's an option with a value (e.g., --name=John)
        const [name, value] = arg.slice(2).split('=');
        options.push({ name, value });
      } else {
        // It's a flag (e.g., --debug)
        flags.push(arg.slice(2));
      }
    } else {
      // It's an subcommand (e.g., create)
      currentSubcommand = arg;
    }
  }

  // Push the last subcommand if there is one
  if (currentSubcommand) {
    subcommands.push(currentSubcommand);
  }

  return { subcommands, options, flags };
};
