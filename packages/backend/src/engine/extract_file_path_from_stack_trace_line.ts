/**
 * Regex that pulls out the path from a stack trace line. Works for both unix and windows paths
 * The line is something like "at SymbolName (/some/path/to/project/root/backend/auth.ts:3:21)"
 * or on Windows "at SymbolName (C:\some\path\to\project\root\backend\auth.ts:3:21)"
 *
 * This regex pulls out the file path into the "filepath" named matching group
 * In the above examples that would be "/some/path/to/project/root/backend/auth.ts" or "C:\some\path\to\project\root\backend\auth.ts", respectively
 *
 * Note: this regex is duplicated in packages/backend-function/src/extract_file_path_from_stack_trace_line.ts
 * The backend-function package and the backend package do not have a shared dependency where this code could be shared
 * and introducing one just for this regex seems like overkill https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)
 */
export const extractFilePathFromStackTraceLine =
  /\((?<filepath>(\w:)?[^:]*)[:\d]*\)/;
