---
'@aws-amplify/seed': patch
---

Let the user pool decide whether a group exists in `addToUserGroup` instead of the generated outputs, which carry no groups for `referenceAuth` backends
