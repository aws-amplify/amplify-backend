---
'@aws-amplify/sandbox': patch
'@aws-amplify/backend-cli': patch
---

Add 300ms default debounce to sandbox file watcher and expose --debounce-ms CLI option to prevent MultipleSandboxInstancesError on rapid file changes
