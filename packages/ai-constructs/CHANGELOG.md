# @aws-amplify/ai-constructs

## 1.5.0

### Minor Changes

- d09014b: integrate with aws cdk toolkit

### Patch Changes

- 995c3de: Use Node 20 as default runtime in functions
- d8a7304: update api after bumping typescript
- Updated dependencies [8483297]
- Updated dependencies [baaaba9]
- Updated dependencies [a93aa54]
- Updated dependencies [d09014b]
- Updated dependencies [ece77e7]
- Updated dependencies [d50ffb7]
- Updated dependencies [d09014b]
- Updated dependencies [d09014b]
- Updated dependencies [d09014b]
- Updated dependencies [d8a7304]
- Updated dependencies [96fe987]
  - @aws-amplify/platform-core@1.8.0
  - @aws-amplify/plugin-types@1.10.0
  - @aws-amplify/backend-output-schemas@1.6.0

## 1.4.0

### Minor Changes

- 8f59d16: integrate with aws cdk toolkit

### Patch Changes

- Updated dependencies [8f59d16]
- Updated dependencies [0cc2de3]
- Updated dependencies [b2f9042]
- Updated dependencies [9a00a6b]
  - @aws-amplify/plugin-types@1.9.0
  - @aws-amplify/platform-core@1.7.0
  - @aws-amplify/backend-output-schemas@1.5.0

## 1.3.0

### Minor Changes

- 921fdad: Adding document support for ai conversation routes

### Patch Changes

- 99f5d0b: lint and format with new version of prettier
- 2102071: Upgrade CDK version to 2.180.0
- Updated dependencies [99f5d0b]
- Updated dependencies [fad46a4]
- Updated dependencies [2102071]
  - @aws-amplify/backend-output-schemas@1.4.1
  - @aws-amplify/platform-core@1.6.5
  - @aws-amplify/plugin-types@1.8.1

## 1.2.4

### Patch Changes

- 7d1415e: Adapt unit test to handle new cdk release

## 1.2.3

### Patch Changes

- bc07307: Update code with Eslint@8 compliant
- Updated dependencies [bc07307]
  - @aws-amplify/platform-core@1.6.2

## 1.2.2

### Patch Changes

- 3603cc7: Include padding from bedrock in AI chunked responses

## 1.2.1

### Patch Changes

- d46024e: Log streaming progress
- Updated dependencies [a712983]
  - @aws-amplify/platform-core@1.5.1

## 1.2.0

### Minor Changes

- a66f5f2: Expose timeout property

## 1.1.0

### Minor Changes

- 65abf6a: Add options to control log settings

### Patch Changes

- 72b2fe0: update aws-cdk lib to ^2.168.0
- Updated dependencies [cfdc854]
- Updated dependencies [72b2fe0]
- Updated dependencies [65abf6a]
- Updated dependencies [f6ba240]
  - @aws-amplify/platform-core@1.3.0
  - @aws-amplify/plugin-types@1.6.0

## 1.0.0

### Major Changes

- bbd6add: GA release of backend AI features

### Patch Changes

- fd8759d: Fix a case when Bedrock throws validation error if tool input is not persisted in history

## 0.8.2

### Patch Changes

- bc6dc69: Fix case where tool use does not have input while streaming

## 0.8.1

### Patch Changes

- 1af5060: Add metadata to user agent in conversation handler runtime.
- Updated dependencies [583a3f2]
  - @aws-amplify/platform-core@1.2.0

## 0.8.0

### Minor Changes

- 37dd87c: Propagate errors to AppSync

### Patch Changes

- 613bca9: Remove tool usage for non current turns when looking up message history
- b56d344: update aws-cdk lib to ^2.158.0
- Updated dependencies [b56d344]
  - @aws-amplify/plugin-types@1.3.1

## 0.7.0

### Minor Changes

- 63fb254: Include accumulated turn content in chunk mutation

## 0.6.2

### Patch Changes

- bd4ff4d: Add memory setting to conversation handler
- Updated dependencies [5f46d8d]
  - @aws-amplify/backend-output-schemas@1.4.0

## 0.6.1

### Patch Changes

- 91e7f3c: Parse client side tool json elements

## 0.6.0

### Minor Changes

- b6761b0: Stream Bedrock responses

## 0.5.0

### Minor Changes

- 46a0e85: Remove deprecated messages field from event

### Patch Changes

- faacd1b: Fix case where bedrock content blocks would be populated with 'null' instead of 'undefined.

## 0.4.0

### Minor Changes

- 4781704: Add information about event version to conversation components
- 3a29d43: Pass user agent in conversation handler lambda

### Patch Changes

- 6e4a62f: Fix multi tool usage in single turn.

## 0.3.0

### Minor Changes

- 300a72d: Infer executable tool input type from input schema
- 0a5e51c: Stream conversation logs in sandbox

### Patch Changes

- Updated dependencies [0a5e51c]
  - @aws-amplify/backend-output-schemas@1.3.0

## 0.2.0

### Minor Changes

- d0a90b1: Use message history instead of event payload for conversational route

## 0.1.4

### Patch Changes

- 8e964e1: fix invalid graphql in tool query generation

## 0.1.3

### Patch Changes

- 041d041: Do not bundle AWS SDK if default implementation is used

## 0.1.2

### Patch Changes

- daac630: Remove runtime namespace from main exports

## 0.1.1

### Patch Changes

- 61669ff: Handle base64 images in conversation handler
- da9c60c: Add main entry point in ai-constructs package
- c17e397: Un-peer Bedrock dependencies

## 0.1.0

### Minor Changes

- 99c8b6a: Add new @aws-amplify/ai-constructs and @aws-amplify/backend-ai packages with a conversation handler.
