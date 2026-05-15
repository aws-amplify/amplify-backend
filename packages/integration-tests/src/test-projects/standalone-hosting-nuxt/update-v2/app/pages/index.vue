<script setup lang="ts">
const { data } = await useFetch('/api/backend-status');
const userPoolId = computed(() => data.value?.userPoolId ?? 'none');
const backendStatus = computed(() => data.value?.backendStatus ?? 'disconnected');
const graphqlResult = computed(() => data.value?.graphqlResult ?? 'no-query');
</script>

<template>
  <main>
    <h1>Hello SSR v2</h1>
    <p>Server-rendered by Lambda via Nitro (v2 deploy).</p>
    <p data-testid="backend-status">backend-{{ backendStatus }}</p>
    <p data-testid="graphql-result">{{ graphqlResult }}</p>
    <p data-testid="user-pool-id">{{ userPoolId }}</p>
    <nav>
      <a href="/about">About</a>
      <a href="/swr">SWR Page</a>
    </nav>
  </main>
</template>
