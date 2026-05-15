---
'@aws-amplify/hosting': minor
---

fix(hosting): move @opennextjs/aws to optional peerDependency

Moves `@opennextjs/aws` from a direct dependency to an optional peer dependency.
This avoids installing OpenNext for SPA/static hosting users who don't need it.

Next.js projects must now install `@opennextjs/aws` as a devDependency:

```bash
npm install --save-dev @opennextjs/aws
```

The adapter now runs `npx @opennextjs/aws build` from the project directory,
resolving the binary naturally through npm without fragile filesystem walking.
If the package is missing, a clear error message tells the user exactly what to install.
