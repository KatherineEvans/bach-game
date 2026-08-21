<script setup>
import { RouterLink } from 'vue-router'
import ResetShoe from '../components/ResetShoe.vue'
import { totalVotes, completedRuns, hasStarted } from '../composables/useTournament.js'
</script>

<template>
  <div class="home">
    <ResetShoe />

    <section class="home-blurb">
      <p class="home-lede">
        Sixteen four-legged heartthrobs. One winner's circle. Zero mane events wasted.
      </p>
      <p>
        Everyone in the room saddles up on their own phone, we run the bracket
        round by round, and the results gallop in live. No horsing around —
        the room votes, and the hottest horse takes home the roses.
      </p>
      <p class="home-tagline">
        Whether you're here to <em>rein</em> supreme in the bracket or just
        <em>foal</em>-low along with the tallies, giddy up and pick your poison.
      </p>
    </section>

    <div class="home-actions">
      <RouterLink to="/results" class="home-btn home-btn--results">
        <span class="home-btn-icon" aria-hidden="true">📊</span>
        <span class="home-btn-label">Watch the Results</span>
        <span class="home-btn-sub">Live tallies as the room votes</span>
      </RouterLink>

      <RouterLink to="/vote" class="home-btn home-btn--vote">
        <span class="home-btn-icon" aria-hidden="true">🐴</span>
        <span class="home-btn-label">Vote in the Bracket</span>
        <span class="home-btn-sub">Round of 16 → the Winner's Circle</span>
      </RouterLink>
    </div>

    <p v-if="hasStarted" class="home-stats">
      <b>{{ totalVotes }}</b> {{ totalVotes === 1 ? 'vote' : 'votes' }} cast
      <template v-if="completedRuns.length">
        · <b>{{ completedRuns.length }}</b>
        {{ completedRuns.length === 1 ? 'bracket' : 'brackets' }} finished
      </template>
    </p>

    <p class="home-hoofnote">
      Hitched a wrong pick? Tap the horseshoe up top to muck out the current
      bracket. Your Hall of Fame stays right where it is.
    </p>
  </div>
</template>
