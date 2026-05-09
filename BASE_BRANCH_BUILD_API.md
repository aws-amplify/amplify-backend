# Base Branch SPA Adapter & Hosting Config - Build Handling Analysis

## Original API Surface for Build Control

### 1. **HostingProps Interface** (types.ts)

```typescript
export type HostingProps = {
  /**
   * Optional build command (e.g., 'npm run build').
   * Used by adapters to build the project before deploying.
   */
  buildCommand?: string;

  /**
   * Directory containing built output (e.g., 'dist', 'build').
   * Auto-detected from framework if not specified.
   */
  buildOutputDir?: string;

  /**
   * Framework type — auto-detected from package.json or set explicitly.
   * Accepts built-in values ('nextjs', 'spa', 'static') or any custom string.
   */
  framework?: FrameworkType;

  /**
   * Custom framework adapter for unsupported frameworks.
   * When provided, this adapter is used instead of the built-in registry lookup.
   */
  customAdapter?: FrameworkAdapterFn;

  /**
   * Custom domain configuration.
   */
  domain?: { ... };
  // ... other props
};
```

### 2. **defineHosting() Factory Function** (factory.ts)

The factory function accepted `HostingProps` and handled the build workflow:

```typescript
export const defineHosting = (props: HostingProps = {}): HostingResult => {
  // ... setup code ...

  // Run the build command if provided
  if (props.buildCommand) {
    runBuild({
      command: props.buildCommand,
      cwd: projectDir,
    });
  }

  // Default build output dirs per framework
  const buildOutputDir =
    props.buildOutputDir ?? getDefaultBuildOutputDir(framework);

  const absoluteBuildOutputDir = path.isAbsolute(buildOutputDir)
    ? buildOutputDir
    : path.join(projectDir, buildOutputDir);

  // Get the adapter (custom or registry) and run it to produce .amplify-hosting/
  const adapter = props.customAdapter ?? getAdapter(framework);
  const manifest = adapter(absoluteBuildOutputDir, projectDir);
  // ...
};
```

### 3. **Build Execution** (build/runner.ts)

The `runBuild()` function executed the build command synchronously:

```typescript
export const runBuild = (options: BuildRunnerOptions): BuildRunnerResult => {
  const { command, cwd, env } = options;

  try {
    process.stderr.write(`\nBuilding with: ${command}\n`);

    // Shell execution is intentional to support compound commands
    const stdout = execSync(command, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50 MB
    });

    return {
      stdout: stdout ?? '',
      exitCode: 0,
    };
  } catch (error) {
    // ... error handling ...
    throw new HostingError('BuildError', { ... });
  }
};
```

### 4. **SPA Adapter** (adapters/spa.ts)

The SPA adapter transformed the build output directory into the canonical `.amplify-hosting/` structure:

```typescript
export const spaAdapter = (
  buildOutputDir: string,
  projectDir: string,
): DeployManifest => {
  // Validates that buildOutputDir exists and contains index.html
  if (!fs.existsSync(buildOutputDir)) {
    throw new HostingError('BuildOutputNotFoundError', { ... });
  }

  const files = fs.readdirSync(buildOutputDir);
  if (files.length === 0) {
    throw new HostingError('BuildOutputEmptyError', { ... });
  }

  if (!files.includes('index.html')) {
    throw new HostingError('MissingIndexHtmlError', { ... });
  }

  // Copy all build output to .amplify-hosting/static/
  copyDirRecursive(buildOutputDir, staticDir);

  // Generate deploy manifest
  const manifest: DeployManifest = {
    version: 1,
    routes: [
      {
        path: '/*',
        // ... route config
      }
    ]
  };
  // ...
};
```

### 5. **Example Usage** (test-projects/standalone-hosting-spa/amplify/hosting.ts)

```typescript
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  buildOutputDir: 'static-site',
});
```

## Build Workflow Summary

The original API surface followed this sequence:

1. **User defines hosting config** via `defineHosting({ buildCommand?, buildOutputDir?, framework?, ... })`
2. **Factory function runs build** (if `buildCommand` provided):
   - Executes `buildCommand` synchronously via `execSync()`
   - Captures stdout/stderr
   - Throws `HostingError` if build fails
3. **Determines build output directory**:
   - Uses `buildOutputDir` if provided
   - Falls back to framework-specific defaults (e.g., `dist/` for SPA)
4. **Runs framework adapter**:
   - SPA adapter validates `index.html` exists
   - Copies build output to `.amplify-hosting/static/`
   - Generates deploy manifest with routing rules
5. **Returns HostingResult** with CDK resources and `createStack()` helper

## Key Design Points

- **Optional build command**: `buildCommand` was optional; users could pre-build and just point to output
- **Framework-aware defaults**: Each framework had default output directories
- **Synchronous execution**: Build ran during `defineHosting()` call (synthesis time)
- **Adapter pattern**: Framework-specific adapters handled output transformation
- **Error handling**: Clear error messages for missing builds, empty outputs, missing index.html
- **Shell support**: Build command supported compound commands (e.g., `npm ci && npm run build`)
- **Environment passthrough**: Build inherited parent process environment + optional overrides

## Critical Implementation Details

### Build Command Execution

- Uses `child_process.execSync()` for synchronous execution
- Supports compound commands via shell interpretation
- 50 MB buffer for large build outputs
- Inherits parent process environment + optional overrides
- Throws `HostingError('BuildError')` on non-zero exit

### SPA Adapter Validation

- **Must have**: `index.html` in build output
- **Must not be**: Empty directory
- **Must exist**: Build output directory at specified path
- **Copies to**: `.amplify-hosting/static/` with recursive copy
- **Generates**: Deploy manifest with catch-all route `/*` → SPA index.html

### Default Build Output Directories

- Framework-specific defaults used if `buildOutputDir` not provided
- SPA framework typically defaults to `dist/`
- Supports both absolute and relative paths
