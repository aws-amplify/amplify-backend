import execa from "execa";

export const executeCDKCommand = async (...args: string[]) => {
  await execa("npx", ["cdk", ...args], { stdio: "inherit" });
};
