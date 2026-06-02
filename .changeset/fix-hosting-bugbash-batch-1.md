---
'@aws-amplify/hosting': patch
---

fix(hosting): three Blocks bug-bash quality fixes — replace deprecated `Function#logRetention` with explicit `LogGroup` (silences `will be removed in the next major release` warning on every synth); enable OpenNext `minify: true` in the generated `open-next.config.ts` so the SSR Lambda bundle is meaningfully smaller (was 34-35 MB, scary "⚠️" flagged by 19/20 testers); pre-emit an explanatory line before `npx @opennextjs/aws build` so the upstream `Wrapper aws-lambda-streaming and converter aws-apigw-v1 are not compatible` error doesn't read as a fatal build failure (Amplify Hosting fronts the SSR Lambda with API Gateway v1 and patches the streaming wrapper after the build).
