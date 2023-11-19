import { defineBackend } from '@aws-amplify/backend';
// we do not need to use explicit file extensions when using `"moduleResolution": "bundler"`
import { storage } from './storage/resource';

defineBackend({
  storage,
});

/**
 * TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
 */
const set: Set<string> = new Set();
set.add('foo');
for (const val of set) {
  console.log(val);
}

/**
 * TS2802: Type 'IterableIterator<[string, MatchResult]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
 */
const map: Map<string, string> = new Map();
map.set('foo', 'bar');
for (const [key, val] of map.entries()) {
  console.log(`${key}:${val}`);
}

/**
 * The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', or 'nodenext'.
 */
console.log(import.meta.url);
