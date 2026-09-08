<script setup lang="ts">
const timestamp = Date.now();
</script>

<template>
  <main>
    <h1>Hello SSR v1</h1>
    <p>SWR page generated at: {{ timestamp }}</p>
    <p>This page uses stale-while-revalidate caching.</p>
    <a href="/">Back to Home</a>
  </main>
</template>
