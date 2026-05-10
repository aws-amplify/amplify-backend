# Git Damage Assessment Report

**Date:** Sunday, May 10, 2026 at 13:38 UTC  
**Status:** READ-ONLY INVESTIGATION COMPLETE

---

## EXECUTIVE SUMMARY

**CRITICAL DAMAGE DETECTED** on `origin/feat/opennext-adapter`:

- ✅ **snapshot/iac-hosting**: SAFE (no damage)
- ❌ **feat/opennext-adapter**: SEVERELY DAMAGED (force-pushed/rewritten)
- ⚠️ **feat/opennext-adapter-backup**: Contains lost commits (recovery source available)

---

## DETAILED FINDINGS

### 1. feat/opennext-adapter Status: **DAMAGED**

**Remote HEAD:** `f7dbc39ed9` (chore: clean branch - only hosting, integration-tests, and config changes)

**Local HEAD:** `f7dbc39ed9` (same - in sync)

**Backup comparison:**

- Remote `feat/opennext-adapter`: `f7dbc39ed9fe5aa29cf1e2bbe23f944496e34f43`
- Remote `feat/opennext-adapter-backup`: `1980b9e5aeb40e634a471d1e1e482dbf61c38987`
- **Result:** DIFFERENT - branch was rewritten/force-pushed

**Lost commits (on backup, NOT on current feat/opennext-adapter):**

```
1980b9e5ae fix: sandbox test + SSR config discovery + spellcheck
db76227e7b fix: add CodeQL suppression comment for trusted test infrastructure code
fe257264ff fix: lint errors (unused var, Next.js naming, import deps, spellcheck) + prettier
82e442abad feat(hosting): deploy revalidation worker Lambda for ISR background regeneration
bbad3d01c8 fix: lint/prettier, CodeQL suppression, fix sandbox_command.test assertion
4978e9acd9 chore: remove accidental files (mise.toml, API scratchpad), revert CDK version
bc5d9e549d fix: ISR template literal for single text node, relax image content-type
3528391012 fix: ISR test retry, image opt x86_64 arch, adapter skipBuild option
4fae11ed36 fix(test): ISR page content, image Accept header, pin Next.js 15.5.15
eb8a9a9ad3 fix: middleware URL base, CDK tsx, SQS FIFO lookup, image opt pin
c5343fb96d fix(hosting): FIFO queue for ISR, fix middleware/image-opt origins, CDK ESM
293b5f010d fix(hosting): add OPEN_NEXT_ORIGIN env, DynamoDB revalidate GSI, fix image opt + CDK ESM
a8b192c822 fix(hosting): add SQS queue CfnOutput and fix vanilla-cdk-ssr app path
f70db6bf18 fix(hosting): add missing OpenNext env vars, fix image opt origin + arm64
27f2a306fc fix(test): vanilla-cdk-ssr overrides build script to next build
681da3e033 fix(hosting): ISR env var mismatch, image opt routing, static cache-control
c9ec153548 fix(test): fix SPA test assertions — deploy from dist/, add v2 dist content
47188f3bec revert: remove @types/react from root package.json (wrongly added)
f78638206d fix(test): add JSX config to vanilla-cdk-ssr tsconfig
5ec2f67fa6 test: make vanilla-cdk-ssr a real Next.js app
```

**Total lost commits:** 20 commits (significant work)

**What happened:**

- The branch was cleaned to only contain: hosting, integration-tests, and config changes
- All ISR (Incremental Static Regeneration) fixes were removed
- All test fixes were removed
- All CDK/environment variable fixes were removed
- The cleanup appears intentional but destructive

**Local reflog shows the sequence:**

```
f7dbc39ed9 (current) - chore: clean branch
b9a228639b - reset to origin/snapshot/iac-hosting
d9d2fd2f44 - revert cleanup (kept mise.toml)
bc2a5ac429 - revert of revert
d686642be1 - aggressive cleanup (removed mise.toml, formatting)
```

---

### 2. snapshot/iac-hosting Status: **SAFE**

**Remote HEAD:** `b9a228639b` (chore: reset unintended changes to match main)

**Local HEAD:** `b9a228639b` (same - in sync)

**Verification:**

- ✅ Commit `b9a228639b` exists in history (is an ancestor)
- ✅ No force-push detected
- ✅ Branch is stable and matches backup point

**History:**

```
b9a228639b chore: reset unintended changes to match main
dc3eaacdd7 Fix: Restore package-lock.json from main and regenerate with current dependencies
781e1cca4e chore: regenerate package-lock after rebase onto main
5d878d12f0 chore: update API documentation
b5b92865cd fix(hosting): handle monorepo standalone output in Next.js adapter (#3180)
```

---

### 3. feat/opennext-adapter-backup Status: **INTACT (Recovery Source)**

**Remote HEAD:** `1980b9e5ae` (fix: sandbox test + SSR config discovery + spellcheck)

**Status:** Contains all 20 lost commits from feat/opennext-adapter

**This branch is the recovery source** for the lost work.

---

## LOCAL BRANCH STATUS

```
feat/nextjs-adapter-api       0e16ebee34 feat(hosting): integrate OpenNext for Next.js adapter
feat/opennext-adapter         f7dbc39ed9 chore: clean branch - only hosting, integration-tests, and config changes
feat/opennext-adapter-backup  1980b9e5ae [ahead 71, behind 14] fix: sandbox test + SSR config discovery + spellcheck
feat/opennext-adapter-rebased 62c9463c5b feat(hosting): rewrite adapter with OpenNext + framework-agnostic DeployManifest
fix/nextjs-adapter-monorepo   85b197b1b7 fix(hosting): handle monorepo standalone output in Next.js adapter
main                          757e2ce016 [behind 1] feat(storage): add keepOnDelete to defineStorage() (#3163)
snapshot/iac-hosting          b9a228639b chore: reset unintended changes to match main
```

---

## RECOVERY OPTIONS

### Option A: Restore from Backup (Recommended)

```bash
# This would restore the 20 lost commits
git reset --hard origin/feat/opennext-adapter-backup
git push origin feat/opennext-adapter --force-with-lease
```

**Risk:** Medium (force-push required, but backup is known-good)

### Option B: Cherry-pick Lost Commits

```bash
# Selectively restore specific fixes
git cherry-pick 1980b9e5ae~19..1980b9e5ae
```

**Risk:** Low (non-destructive, but requires manual conflict resolution)

### Option C: Keep Current State

```bash
# Accept the cleaned branch as-is
# (requires confirming all 20 commits are truly unnecessary)
```

**Risk:** High (loses significant work without confirmation)

---

## RECOMMENDATIONS

1. **Immediate Action:** Do NOT push or modify any branches until stakeholders confirm intent
2. **Verify Intent:** Confirm whether the "clean branch" was intentional or accidental
3. **If Accidental:** Use Option A (restore from backup)
4. **If Intentional:** Document why 20 commits were removed and ensure work is captured elsewhere
5. **Backup Strategy:** Keep `feat/opennext-adapter-backup` as permanent recovery point

---

## TIMELINE

- **Local reflog shows:** Multiple resets and reverts over recent operations
- **Last known good state:** `1980b9e5ae` on backup branch
- **Current state:** Cleaned to `f7dbc39ed9` (20 commits behind backup)
- **snapshot/iac-hosting:** Stable at `b9a228639b` (no damage)

---

## CONCLUSION

**feat/opennext-adapter has been force-pushed and 20 commits were lost.** The backup branch contains the lost work and can be used for recovery. **snapshot/iac-hosting is unaffected and safe.**

No action has been taken. This is a read-only assessment only.
