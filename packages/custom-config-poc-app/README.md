
Check out `poc/custom-config` branch from https://github.com/aws-amplify/amplify-backend/tree/poc/custom-config .

To use after checkout:

```shell
# start in repo root
npm install && npm run build
cd packages/custom-config-poc-app
export CUSTOM_CONFIG_POC_APP_API_KEY=<provide some random value>
npx amplify sandbox

# in separate shell
# start in repo root
cd packages/custom-config-poc-app
npm run build
npm run dev

# in browser or separate shell
open http://localhost:3000/
```
