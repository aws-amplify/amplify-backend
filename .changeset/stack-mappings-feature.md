---
'@aws-amplify/backend-data': minor
---

Added `stackMappings` option to `defineData()` for distributing resolvers across multiple nested CloudFormation stacks. This helps avoid the 500-resource limit for projects with complex data models.
