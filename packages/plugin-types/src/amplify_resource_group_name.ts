/**
 * Represents the types of resource group name
 */
export type AmplifyResourceGroupName =
  | 'auth'
  | 'data'
  | 'storage'
  // eslint-disable-next-line spellcheck/spell-checker
  // `(string & { resourceGroupNameLike?: any} )` is a workaround to allow default resource group names to show up in IntelliSense while allowing any string to be passed.
  // See https://github.com/microsoft/TypeScript/issues/29729#issuecomment-460346421.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (string & { resourceGroupNameLike?: any });
