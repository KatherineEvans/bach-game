<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { HORSES, ROUND_META } from '../data/horses.js'
import {
  rounds, champion, totalVotes, loading, error,
} from '../composables/useTournament.js'

// Pick the round the room is voting on right now — first with any undecided
// matchup. If everything is decided, hold on the final so the champion splash
// still makes sense next to the final matchup tile.
const currentRoundIndex = computed(() => {
  const rs = rounds.value
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]
    if (!r?.length) continue
    if (r.some((m) => !m?.winner)) return i
  }
  return Math.max(0, rs.length - 1)
})

const currentMeta = computed(() => ROUND_META[currentRoundIndex.value])
const currentMatches = computed(() => rounds.value[currentRoundIndex.value] ?? [])

const roundVotes = computed(() =>
  currentMatches.value.reduce((n, m) => n + (m?.total ?? 0), 0),
)

const shareFor = (match, key) => {
  const total = match?.total ?? 0
  if (!total) return 0
  return Math.round(((match.counts?.[key] ?? 0) / total) * 100)
}

const leadingKey = (match) => {
  if (!match) return null
  if (match.winner) return match.winner
  const a = match.counts?.[match.a] ?? 0
  const b = match.counts?.[match.b] ?? 0
  if (a === b) return null
  return a > b ? match.a : match.b
}

const championHorse = computed(() =>
  champion.value ? HORSES[champion.value] : null,
)

// Round of 16 → 4 columns; smaller rounds → 2 columns for readability.
const gridClass = computed(() => {
  const n = currentMatches.value.length
  if (n >= 5) return 'r-grid r-grid--4'
  if (n >= 3) return 'r-grid r-grid--2'
  return 'r-grid r-grid--1'
})
</script>

<template>
  <p v-if="error" class="banner error">{{ error }}</p>
  <p v-if="loading" class="banner">Loading the results…</p>

  <template v-else>
    <div class="results">
      <header class="r-header">
        <div class="r-live">
          <span class="live-dot" aria-hidden="true"></span>
          <span>Live</span>
        </div>
        <div class="r-title-block">
          <p class="r-eyebrow">{{ championHorse ? 'The room has spoken' : 'Now on the track' }}</p>
          <h2 class="r-title">{{ currentMeta?.name }}</h2>
        </div>
        <div class="r-stat-row">
          <div class="r-stat">
            <div class="r-stat-num">{{ roundVotes }}</div>
            <div class="r-stat-lbl">This round</div>
          </div>
          <div class="r-stat">
            <div class="r-stat-num">{{ totalVotes }}</div>
            <div class="r-stat-lbl">All-time</div>
          </div>
        </div>
      </header>

      <!-- CHAMPION BANNER (compact, inline) -->
      <section v-if="championHorse" class="r-champ">
        <img :src="championHorse.img" :alt="championHorse.name" class="r-champ-photo" />
        <div class="r-champ-text">
          <div class="r-champ-eyebrow">🏆 Hottest Horse 🏆</div>
          <div class="r-champ-name">{{ championHorse.name }}</div>
          <div class="r-champ-sub">{{ championHorse.sub }}</div>
        </div>
      </section>

      <!-- MATCHUP TILES -->
      <div v-if="!currentMatches.length" class="empty">
        The starting gates aren't open yet.
      </div>

      <ol v-else :class="gridClass">
        <li
          v-for="(match, i) in currentMatches"
          :key="match?.id ?? i"
          class="r-tile"
          :class="{ decided: !!match?.winner }"
        >
          <div class="r-tile-head">
            <span class="r-tile-num">#{{ i + 1 }}</span>
            <span v-if="match?.winner" class="r-tile-lock">Locked in ✓</span>
            <span v-else class="r-tile-open">
              <span class="live-dot live-dot--sm" aria-hidden="true"></span>Open
            </span>
          </div>

          <div
            v-for="key in [match?.a, match?.b]"
            :key="key ?? 'tbd'"
            class="r-row"
            :class="{
              leading: leadingKey(match) === key && (match?.total ?? 0) > 0,
              winner: match?.winner === key,
              loser: match?.winner && match.winner !== key,
            }"
          >
            <img
              v-if="key && HORSES[key]"
              :src="HORSES[key].img"
              :alt="HORSES[key].name"
              class="r-thumb"
              loading="lazy"
            />
            <div class="r-row-body">
              <div class="r-row-name">
                {{ key ? HORSES[key]?.name : 'TBD' }}
                <span v-if="match?.winner === key" class="r-crown" aria-hidden="true">🏆</span>
              </div>
              <div class="r-row-bar">
                <span class="r-row-fill" :style="{ width: shareFor(match, key) + '%' }"></span>
              </div>
            </div>
            <div class="r-row-count">
              <b>{{ match?.counts?.[key] ?? 0 }}</b>
              <span>{{ shareFor(match, key) }}%</span>
            </div>
          </div>
        </li>
      </ol>

      <div class="r-footer">
        <RouterLink to="/" class="navbtn">← Home</RouterLink>
        <span class="r-total">
          Total votes cast: <b>{{ totalVotes }}</b>
        </span>
        <RouterLink to="/vote" class="navbtn primary">Cast a vote →</RouterLink>
      </div>
    </div>
  </template>
</template>
