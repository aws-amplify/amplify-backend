# @aws-amplify/ai-constructs

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
