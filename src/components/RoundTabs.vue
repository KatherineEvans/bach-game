<script setup>
import { ROUND_META } from '../data/horses.js'
import {
  viewIdx, champion, roundComplete, roundUnlocked, goTo, CHAMPION_VIEW, HALL_VIEW,
} from '../composables/useTournament.js'
</script>

<template>
  <nav class="tabs" aria-label="Tournament rounds">
    <button
      v-for="(meta, i) in ROUND_META"
      :key="meta.name"
      class="tab"
      :class="{ done: roundComplete(i), active: viewIdx === i }"
      :disabled="!roundUnlocked(i)"
      @click="goTo(i)"
    >
      <span v-if="roundComplete(i)" class="check">✓</span>{{ meta.name }}
    </button>

    <button
      class="tab"
      :class="{ done: !!champion, active: viewIdx === CHAMPION_VIEW }"
      :disabled="!champion"
      @click="goTo(CHAMPION_VIEW)"
    >
      🏆 Champion
    </button>

    <button
      class="tab"
      :class="{ active: viewIdx === HALL_VIEW }"
      @click="goTo(HALL_VIEW)"
    >
      📜 Hall of Fame
    </button>
  </nav>
</template>
