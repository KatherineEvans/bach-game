<script setup>
import { HORSES, ROUND_META } from '../data/horses.js'
import { rounds, champion } from '../composables/useTournament.js'

const playedRounds = () =>
  rounds.value
    .map((round, i) => ({ i, round }))
    .filter(({ i, round }) => i < ROUND_META.length && round.some((m) => m.a || m.b))

const contenders = (match) => [match.a, match.b].filter(Boolean)
</script>

<template>
  <details class="recap">
    <summary>See full bracket so far</summary>

    <div v-for="{ i, round } in playedRounds()" :key="i" class="recap-round">
      <h4>{{ ROUND_META[i].name }}</h4>
      <div class="recap-chips">
        <template v-for="(match, mi) in round" :key="mi">
          <span
            v-for="key in contenders(match)"
            :key="key"
            class="recap-chip"
            :class="{ win: match.winner === key }"
          >
            {{ HORSES[key].name }}<template v-if="match.winner === key"> ✓</template>
          </span>
        </template>
      </div>
    </div>

    <div v-if="champion" class="recap-round">
      <h4>Champion</h4>
      <div class="recap-chips">
        <span class="recap-chip win">🏆 {{ HORSES[champion].name }}</span>
      </div>
    </div>
  </details>
</template>
