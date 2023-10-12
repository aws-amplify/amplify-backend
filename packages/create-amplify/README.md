create-amplify is a package allows the user to create an Amplify project by running `npm create amplify` (or using one of other popular package managers).

## Usage

In a project folder or empty folder, run `npm create amplify@alpha`.

## Dev

1. Publish to local

You have to publish to local every time after making a change

```sh
# In samsara-cli repo
npm run clean
npm run install:local
npm run build
npm run vend
```

2. Prepare to install

```sh
# On your local machine
rm -rf $(npm config get cache)/_npx # clean npm cache globally
mkdir amplify-project-$(date +%Y-%m-%d) # create an empty folder. Alternatively, you can create a project by running e.g `npx create-next-app next-$(date +%Y-%m-%d)`.
cd amplify-project-$(date +%Y-%m-%d) # cd into the empty folder
```

3. Create Amplify Project

```sh
# In the folder created in the previous step
npm create amplify@alpha
```

## Test

```sh
# In samsara-cli repo
npm run build # Have to build every time after making a change before running test
npm run test:dir packages/create-amplify # Run all test in create-amplify
npm run test:dir packages/create-amplify/src/<file-name>.test.ts # Run all test in one file. e.g. npm run test:dir packages/create-amplify/src/get_project_root.test.ts
```
