<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const isHome = computed(() => route.name === 'home')
const isResults = computed(() => route.name === 'results')
</script>

<template>
  <div class="app" :class="{ 'app--wide': isResults, 'app--compact': isResults }">
    <header class="masthead" :class="{ 'masthead--compact': isResults }">
      <div v-if="!isResults" class="eyebrow">A Bachelorette Bracket</div>
      <h1>
        <RouterLink v-if="!isHome" to="/" class="masthead-link">
          The Hottest <span>Horse</span> Invitational
        </RouterLink>
        <template v-else>The Hottest <span>Horse</span> Invitational</template>
      </h1>
      <template v-if="!isResults">
        <div class="rule">🐴</div>
        <div class="tagline">16 leading stallions enter. One winner's circle awaits.</div>
      </template>
    </header>

    <RouterView />
  </div>
</template>
