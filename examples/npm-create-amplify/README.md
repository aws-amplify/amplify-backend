# Example: `npm create amplify`

This example serves as the baseline output of `npm create amplify`. The CLI will create the following files:

- `amplify.config.ts` with a default `backendDir` value of `amplify`
  - by defining this directory choice up front it allows customers to easily recognize and understand how to configure this choice
- `amplify/` (directory for resources)
- `amplify/auth.ts` with a basic auth resource with login via Email
- `amplify/data.ts` with a basic Todo schema scaffolding

## Sample Execution of `npm create amplify`

```console
➜  npm create amplify
Need to install the following packages:
  create-amplify@1.0.0
Ok to proceed? (y) y
? Project name my-amplify-project
✔ Copied template files

Next steps:
- cd my-amplify-project
- npm install (or pnpm install, or yarn)
- npm run dev
```
