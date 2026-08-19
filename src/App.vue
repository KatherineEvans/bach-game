<script setup>
import RoundTabs from './components/RoundTabs.vue'
import RoundView from './components/RoundView.vue'
import ChampionView from './components/ChampionView.vue'
import HallOfFame from './components/HallOfFame.vue'
import {
  viewIdx, champion, hasStarted, resetBracket, clearAllVotes,
  CHAMPION_VIEW, HALL_VIEW,
} from './composables/useTournament.js'

function onResetBracket() {
  if (confirm('Reset the current bracket? These picks will be cleared and not recorded.')) {
    resetBracket()
  }
}

function onClearAll() {
  if (confirm('Erase every vote ever recorded on this device? This cannot be undone.')) {
    clearAllVotes()
  }
}
</script>

<template>
  <div class="app">
    <header class="masthead">
      <div class="eyebrow">A Bachelorette Bracket</div>
      <h1>The Hottest <span>Horse</span> Invitational</h1>
      <div class="rule">🐴</div>
      <div class="tagline">16 leading stallions enter. One winner's circle awaits.</div>
    </header>

    <RoundTabs />

    <main>
      <HallOfFame v-if="viewIdx === HALL_VIEW" />
      <ChampionView v-else-if="viewIdx === CHAMPION_VIEW && champion" />
      <RoundView v-else :key="viewIdx" :round-index="Math.min(viewIdx, 3)" />
    </main>

    <div class="footer-actions">
      <button v-if="hasStarted" class="reset-link" @click="onResetBracket">
        Reset current bracket
      </button>
      <button class="reset-link" @click="onClearAll">Erase all recorded votes</button>
    </div>

    <p class="saved-note">Your picks save to this browser automatically.</p>
  </div>
</template>
