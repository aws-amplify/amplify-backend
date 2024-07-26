---
'@aws-amplify/deployed-backend-client': patch
'@aws-amplify/model-generator': patch
'@aws-amplify/client-config': patch
'@aws-amplify/backend-cli': patch
---

wrap CloudFormation client stack does not exist errors in AmplifyUserError
