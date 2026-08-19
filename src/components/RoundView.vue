<script setup>
import { computed } from 'vue'
import MatchCard from './MatchCard.vue'
import BracketRecap from './BracketRecap.vue'
import { ROUND_META } from '../data/horses.js'
import { rounds, roundComplete, pickWinner, goTo, CHAMPION_VIEW } from '../composables/useTournament.js'

const props = defineProps({
  roundIndex: { type: Number, required: true },
})

const meta = computed(() => ROUND_META[props.roundIndex])
const matches = computed(() => rounds.value[props.roundIndex])
const isLastRound = computed(() => props.roundIndex === rounds.value.length - 1)
const canGoNext = computed(() => roundComplete(props.roundIndex))

function next() {
  goTo(isLastRound.value ? CHAMPION_VIEW : props.roundIndex + 1)
}
</script>

<template>
  <div class="round-header">
    <p class="rname">{{ meta.name }}</p>
    <p class="rsub">{{ meta.sub }}</p>
    <p class="rhint">{{ meta.hint }}</p>
  </div>

  <div class="matches">
    <MatchCard
      v-for="(match, i) in matches"
      :key="i"
      :match="match"
      :index="i"
      @pick="pickWinner(roundIndex, i, $event)"
    />
  </div>

  <div class="roundnav">
    <button class="navbtn" :disabled="roundIndex === 0" @click="goTo(roundIndex - 1)">
      ← Back
    </button>
    <button class="navbtn" :disabled="!canGoNext" @click="next">
      {{ isLastRound ? 'Crown the winner →' : 'Next →' }}
    </button>
  </div>

  <BracketRecap />
</template>
