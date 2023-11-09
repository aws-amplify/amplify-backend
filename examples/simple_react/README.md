# Simple React App

## Setup

### Clone repo

```shell
git clone git@github.com:aws-amplify/amplify-backend.git
cd amplify-backend
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
npx amplify sandbox --out src
```

### Check that client config was generated

```shell
cat src/amplifyconfiguration.js
```

### Run react app

```shell
npm run start
```
