const fs = require("fs");
const path = require("path");

const projectBasePath = path.resolve(__dirname, "..");

const localEnvConfigPath = path.resolve(
  projectBasePath,
  "amplify/.config/local-env-info.json"
);

const config = {
  projectPath: projectBasePath,
  defaultEditor: "Visual Studio Code",
  envName: "dev",
};

fs.writeFileSync(localEnvConfigPath, JSON.stringify(config, null, 2));
