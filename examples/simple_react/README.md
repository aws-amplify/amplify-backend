# Simple React App

## Setup

### Clone repo

```shell
git clone git@github.com:aws-amplify/samsara-cli.git
cd samsara-cli
```

### Build repo

```shell
npm install && npm run build
```

### Install example's dependencies

```shell
cd examples/simple_react
npm install
```

### Run sandbox

```shell
npx amplify sandbox
```

1. Make change in any file to trigger deployment (see [issue](https://github.com/aws-amplify/samsara-cli/issues/104))
2. After successful deployment hit CTRL+C

### Generate client config

```shell
npx amplify generate config --stack amplify-simple-react-$(whoami)-sandbox --out src
```

### Run react app

```shell
npm run start
```
