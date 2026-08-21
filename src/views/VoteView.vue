<script setup>
import { computed, ref, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import MatchCard from '../components/MatchCard.vue'
import { ROUND_META } from '../data/horses.js'
import {
  rounds, castVote, loading, error, viewIdx, champion,
  advanceEpoch, liveRound,
} from '../composables/useTournament.js'

const currentIdx = computed(() => Math.min(viewIdx.value, ROUND_META.length - 1))
const meta = computed(() => ROUND_META[currentIdx.value])
const matches = computed(() => rounds.value[currentIdx.value] ?? [])
const voted = computed(() => matches.value.filter((m) => m?.myPick).length)
const isFinal = computed(() => currentIdx.value === ROUND_META.length - 1)
const nextMeta = computed(() => ROUND_META[currentIdx.value + 1] ?? null)
const showChampion = computed(() => isFinal.value && !!champion.value)

// The advance button unlocks only when /results broadcasts an advance past
// what this device has already acknowledged.
const seenAdvance = ref(advanceEpoch.value)
const canAdvance = computed(() => advanceEpoch.value > seenAdvance.value)

// Fresh bracket dealt (or a stale localStorage view is ahead of the DB) — snap
// back to the live round and re-arm the advance gate. Wait for load so we
// don't reset against an empty pre-load state. No loop: assignment ends with
// viewIdx === liveRound, which makes the guard false on the next tick.
watchEffect(() => {
  if (loading.value) return
  if (liveRound.value < viewIdx.value) {
    viewIdx.value = liveRound.value
    seenAdvance.value = advanceEpoch.value
  }
})

function onAdvance() {
  seenAdvance.value = advanceEpoch.value
  if (!isFinal.value) viewIdx.value = currentIdx.value + 1
}
</script>

<template>
  <p v-if="error" class="banner error">{{ error }}</p>
  <p v-if="loading" class="banner">Loading the bracket…</p>

  <template v-else-if="showChampion">
    <div class="vote-champion">
      <div class="round-header">
        <p class="rname">🏆 Champion crowned 🏆</p>
        <p class="rsub">The room has spoken</p>
        <p class="rhint">
          The gates will re-open once the host deals a fresh bracket.
        </p>
      </div>
      <div class="roundnav">
        <RouterLink to="/" class="navbtn">← Home</RouterLink>
        <RouterLink to="/results" class="navbtn primary">See the champion →</RouterLink>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="round-header">
      <p class="rname">{{ meta.name }}</p>
      <p class="rsub">{{ meta.sub }}</p>
      <p class="rhint">
        <template v-if="voted === matches.length && matches.length">
          All your picks are in — tap a different horse if you want to switch. Waiting for the host to close voting.
        </template>
        <template v-else>
          {{ meta.hint }} You've picked {{ voted }} of {{ matches.length }} — tap again to swap.
        </template>
      </p>
    </div>

    <div class="matches">
      <MatchCard
        v-for="(match, i) in matches"
        :key="match?.id ?? i"
        :match="match"
        :index="i"
        @vote="castVote(currentIdx, i, $event)"
      />
    </div>

    <div class="roundnav">
      <RouterLink to="/" class="navbtn">← Home</RouterLink>
      <button
        class="navbtn primary advance-btn"
        :disabled="!canAdvance"
        :title="canAdvance ? '' : 'Locked until the host advances on the results page'"
        @click="onAdvance"
      >
        <span v-if="canAdvance">Advance to {{ nextMeta?.name ?? 'the finish' }} →</span>
        <span v-else>
          <span class="advance-lock" aria-hidden="true">🔒</span>
          Waiting for the host to advance…
        </span>
      </button>
    </div>

    <p class="host-note">
      Voting closes on the <RouterLink to="/results" class="saved-note-link">live results page</RouterLink>.
      Once the host advances, this button unlocks and moves you to the next round.
    </p>
  </template>
</template>
