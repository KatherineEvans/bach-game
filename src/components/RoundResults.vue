<script setup>
import { computed } from 'vue'
import HorseCard from './HorseCard.vue'
import { HORSES, ROUND_META } from '../data/horses.js'
import { rounds, goTo, CHAMPION_VIEW } from '../composables/useTournament.js'

const props = defineProps({
  roundIndex: { type: Number, required: true },
})

const meta = computed(() => ROUND_META[props.roundIndex])
const matches = computed(() => rounds.value[props.roundIndex] ?? [])
const isLastRound = computed(() => props.roundIndex === ROUND_META.length - 1)

const totalVotes = computed(() => matches.value.reduce((n, m) => n + (m?.total ?? 0), 0))
const upsets = computed(
  () => matches.value.filter((m) => m?.myPick && m.winner && m.myPick !== m.winner).length,
)

const votesFor = (match, key) => match.counts?.[key] ?? 0
const shareFor = (match, key) =>
  match.total ? Math.round((votesFor(match, key) / match.total) * 100) : 0
const stateFor = (match, key) => {
  if (!match.winner) return ''
  return match.winner === key ? 'winner' : 'loser'
}

function onContinue() {
  goTo(isLastRound.value ? CHAMPION_VIEW : props.roundIndex + 1)
}
</script>

<template>
  <div class="round-header">
    <p class="rname">{{ meta.name }} — Results</p>
    <p class="rsub">How the room voted</p>
    <p class="rhint">
      <template v-if="upsets === 1">One of your picks didn't survive the vote.</template>
      <template v-else-if="upsets > 1">{{ upsets }} of your picks didn't survive the vote.</template>
      <template v-else>The room agreed with every one of your picks.</template>
    </p>
  </div>

  <div class="hall-stats">
    <div class="stat">
      <div class="num">{{ totalVotes }}</div>
      <div class="lbl">Votes this round</div>
    </div>
    <div class="stat">
      <div class="num">{{ matches.length }}</div>
      <div class="lbl">Matchups</div>
    </div>
    <div class="stat">
      <div class="num">{{ upsets }}</div>
      <div class="lbl">{{ upsets === 1 ? 'Upset' : 'Upsets' }}</div>
    </div>
  </div>

  <div class="matches">
    <div v-for="(match, i) in matches" :key="match?.id ?? i" class="match decided">
      <div class="matchlabel">Match {{ i + 1 }}</div>
      <div class="pair">
        <HorseCard
          :horse-key="match.a"
          :state="stateFor(match, match.a)"
          :picked="match.myPick === match.a"
          :votes="votesFor(match, match.a)"
          :share="shareFor(match, match.a)"
        />
        <div class="vs">vs</div>
        <HorseCard
          :horse-key="match.b"
          :state="stateFor(match, match.b)"
          :picked="match.myPick === match.b"
          :votes="votesFor(match, match.b)"
          :share="shareFor(match, match.b)"
        />
      </div>
      <p v-if="match.winner" class="advances">
        🏆 {{ HORSES[match.winner]?.name }} advances
        <span class="advances-count">
          · {{ match.total }} {{ match.total === 1 ? 'vote' : 'votes' }} cast
        </span>
      </p>
    </div>
  </div>

  <div class="roundnav">
    <button class="navbtn" @click="goTo(roundIndex)">← Back to picks</button>
    <button class="navbtn primary" @click="onContinue">
      {{ isLastRound ? 'Crown the winner 🏆' : `On to the ${ROUND_META[roundIndex + 1].name} →` }}
    </button>
  </div>
</template>
