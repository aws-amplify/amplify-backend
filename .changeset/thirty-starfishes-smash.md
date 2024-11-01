---
'create-amplify': patch
'@aws-amplify/cli-core': patch
---

update create-amplify flow to init a tsconfig that forces module context, removes creation of package.json in the amplify directory
