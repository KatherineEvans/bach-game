<script setup>
import { computed } from 'vue'
import MatchCard from './MatchCard.vue'
import BracketRecap from './BracketRecap.vue'
import { ROUND_META } from '../data/horses.js'
import {
  rounds, roundComplete, roundLockable, castVote, lockInRound, goTo, goToResults, busy,
} from '../composables/useTournament.js'

const props = defineProps({
  roundIndex: { type: Number, required: true },
})

const meta = computed(() => ROUND_META[props.roundIndex])
const matches = computed(() => rounds.value[props.roundIndex] ?? [])
const isLastRound = computed(() => props.roundIndex === ROUND_META.length - 1)
const decided = computed(() => roundComplete(props.roundIndex))
const lockable = computed(() => roundLockable(props.roundIndex))
const voted = computed(() => matches.value.filter((m) => m?.myPick).length)

// "Next" goes to this round's tally sheet, not straight to the next round —
// the results are the payoff for voting.
function next() {
  goToResults(props.roundIndex)
}

function onLockIn() {
  const msg = isLastRound.value
    ? 'Crown the Hottest Horse? Voting closes and the champion is final.'
    : `Lock in ${meta.value.name}? Voting closes and the winners advance.`
  if (confirm(msg)) lockInRound(props.roundIndex)
}
</script>

<template>
  <div class="round-header">
    <p class="rname">{{ meta.name }}</p>
    <p class="rsub">{{ meta.sub }}</p>
    <p class="rhint">
      <template v-if="decided">Results are in — winners moved on.</template>
      <template v-else-if="!lockable">Waiting on the previous round.</template>
      <template v-else-if="voted === matches.length">
        All your votes are in. Waiting on the room.
      </template>
      <template v-else>{{ meta.hint }} You've voted in {{ voted }} of {{ matches.length }}.</template>
    </p>
  </div>

  <div class="matches">
    <MatchCard
      v-for="(match, i) in matches"
      :key="match?.id ?? i"
      :match="match"
      :index="i"
      @vote="castVote(roundIndex, i, $event)"
    />
  </div>

  <div class="roundnav">
    <button class="navbtn" :disabled="roundIndex === 0" @click="goTo(roundIndex - 1)">
      ← Back
    </button>

    <button v-if="lockable" class="navbtn primary" :disabled="busy" @click="onLockIn">
      {{ isLastRound ? 'Crown the winner 🏆' : `Lock in ${meta.name} →` }}
    </button>
    <button v-else class="navbtn" :disabled="!decided" @click="next">
      {{ decided ? 'See the results →' : 'Next →' }}
    </button>
  </div>

  <p v-if="lockable" class="host-note">
    “Lock in” is the host's button — it closes voting for everyone.
  </p>

  <BracketRecap />
</template>
