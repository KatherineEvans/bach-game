<script setup>
import { computed } from 'vue'
import { HORSES } from '../data/horses.js'
import { leaderboard, completedRuns, totalVotes } from '../composables/useTournament.js'

const ranked = computed(() => leaderboard.value.filter((h) => h.matchups > 0))
const winRate = (h) => (h.matchups ? Math.round((h.wins / h.matchups) * 100) : 0)

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
</script>

<template>
  <div class="round-header">
    <p class="rname">Hall of Fame</p>
    <p class="rsub">All-Time Standings</p>
    <p class="rhint">Every vote from every phone, across every bracket ever run.</p>
  </div>

  <div class="hall-stats">
    <div class="stat">
      <div class="num">{{ totalVotes }}</div>
      <div class="lbl">Votes cast</div>
    </div>
    <div class="stat">
      <div class="num">{{ completedRuns.length }}</div>
      <div class="lbl">Brackets run</div>
    </div>
    <div class="stat">
      <div class="num">{{ ranked.length }}</div>
      <div class="lbl">Horses judged</div>
    </div>
  </div>

  <p v-if="!ranked.length" class="empty">
    No results yet — head to the Round of 16 and start voting.
  </p>

  <div v-else class="standings">
    <div
      v-for="(h, i) in ranked"
      :key="h.key"
      class="row"
      :class="{ podium: i < 3 && h.wins > 0 }"
    >
      <div class="rank">{{ i + 1 }}</div>
      <img class="thumb" :src="h.img" :alt="h.name" loading="lazy" />
      <div class="who">
        <div class="name">{{ h.name }}</div>
        <div class="sub">{{ h.sub }}</div>
        <div v-if="h.titles" class="crowns">{{ '🏆'.repeat(Math.min(h.titles, 8)) }}
          <template v-if="h.titles > 8">×{{ h.titles }}</template>
        </div>
      </div>
      <div class="score">
        <b>{{ h.wins }}</b>
        {{ h.wins === 1 ? 'win' : 'wins' }} / {{ h.matchups }}
        <template v-if="h.matchups"> · {{ winRate(h) }}%</template>
      </div>
    </div>
  </div>

  <div v-if="completedRuns.length" class="history">
    <h3>Past champions</h3>
    <ol>
      <li v-for="(run, i) in completedRuns" :key="(run.finishedAt ?? '') + i">
        <span>🏆 {{ HORSES[run.champion]?.name ?? 'Unknown' }}</span>
        <span class="when">{{ formatDate(run.finishedAt) }}</span>
      </li>
    </ol>
  </div>
</template>
