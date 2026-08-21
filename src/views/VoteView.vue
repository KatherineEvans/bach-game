<script setup>
import RoundTabs from '../components/RoundTabs.vue'
import RoundView from '../components/RoundView.vue'
import ChampionView from '../components/ChampionView.vue'
import HallOfFame from '../components/HallOfFame.vue'
import RoundResults from '../components/RoundResults.vue'
import { ROUND_META } from '../data/horses.js'
import {
  viewIdx, resultsRound, champion, loading, error,
  CHAMPION_VIEW, HALL_VIEW,
} from '../composables/useTournament.js'
</script>

<template>
  <p v-if="error" class="banner error">{{ error }}</p>
  <p v-if="loading" class="banner">Loading the bracket…</p>

  <template v-else>
    <RoundTabs />

    <main>
      <HallOfFame v-if="viewIdx === HALL_VIEW" />
      <ChampionView v-else-if="viewIdx === CHAMPION_VIEW && champion" />
      <RoundResults v-else-if="resultsRound !== null" :round-index="resultsRound" />
      <RoundView
        v-else
        :key="viewIdx"
        :round-index="Math.min(viewIdx, ROUND_META.length - 1)"
      />
    </main>

    <p class="saved-note">
      Everyone in the room votes from their own phone. Results update live.
      <RouterLink to="/results" class="saved-note-link">Open the live results →</RouterLink>
    </p>
  </template>
</template>
