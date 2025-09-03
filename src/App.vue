<script setup></script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>𝕾𝖙𝖊𝖑𝖑𝖆𝖌𝖔𝖌𝖚𝖊</h1>
    </header>
    <main class="app-main">
      <GachaSystem />
    </main>
  </div>
</template>

<script>
import GachaSystem from './components/gacha/GachaSystem.vue';

export default {
  name: 'App',
  components: {
    GachaSystem
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.app-header {
  padding: 20px;
  text-align: center;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--glass-border);
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}

.app-main {
  flex: 1;
  padding: 20px;
}

</style>
