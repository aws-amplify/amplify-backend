import execa from "execa";

export const executeCDKCommand = async (command: string) => {
  await execa.command(`npx cdk ${command}`, { stdio: "inherit" });
};
