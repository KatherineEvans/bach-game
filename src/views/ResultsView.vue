<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmModal from '../components/ConfirmModal.vue'
import { HORSES, ROUND_META } from '../data/horses.js'
import {
  rounds, champion, totalVotes, loading, error, busy,
  liveRound, lockInRound, dealFreshBracket, broadcastAdvance,
} from '../composables/useTournament.js'

// After a round closes, hold on the just-closed round so the room sees the
// winners revealed. Cleared on "Advance", which also broadcasts to /vote.
const pinnedRound = ref(null)
watch(liveRound, (n, o) => {
  if (o != null && n > o && pinnedRound.value == null) {
    pinnedRound.value = o
  }
})

const displayRound = computed(() => pinnedRound.value ?? liveRound.value)
const displayMeta = computed(() => ROUND_META[displayRound.value])
const displayMatches = computed(() => rounds.value[displayRound.value] ?? [])
const nextMeta = computed(() => ROUND_META[displayRound.value + 1] ?? null)
const isFinal = computed(() => displayRound.value === ROUND_META.length - 1)

const allDecided = computed(
  () => displayMatches.value.length > 0 && displayMatches.value.every((m) => m?.winner),
)
const canClose = computed(
  () =>
    displayMatches.value.length > 0 &&
    displayMatches.value.every((m) => m?.a && m?.b) &&
    displayMatches.value.some((m) => !m?.winner),
)
const roundVotes = computed(() =>
  displayMatches.value.reduce((n, m) => n + (m?.total ?? 0), 0),
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

const gridClass = computed(() => {
  const n = displayMatches.value.length
  if (n >= 5) return 'r-grid r-grid--4'
  if (n >= 3) return 'r-grid r-grid--2'
  return 'r-grid r-grid--1'
})

// --- modal state ------------------------------------------------------------

const closeModalOpen = ref(false)
const freshModalOpen = ref(false)

async function confirmClose() {
  await lockInRound(displayRound.value)
  closeModalOpen.value = false
  // The watcher pins the just-closed round automatically once realtime confirms.
}

function onAdvance() {
  pinnedRound.value = null
  broadcastAdvance()
}

async function confirmFresh() {
  await dealFreshBracket()
  pinnedRound.value = null
  broadcastAdvance()
  freshModalOpen.value = false
}
</script>

<template>
  <p v-if="error" class="banner error">{{ error }}</p>
  <p v-if="loading" class="banner">Loading the results…</p>

  <template v-else>
    <div class="results">
      <header class="r-header">
        <div class="r-live">
          <span class="live-dot" aria-hidden="true"></span>
          <span>{{ allDecided ? 'Locked in' : 'Live' }}</span>
        </div>
        <div class="r-title-block">
          <p class="r-eyebrow">
            {{ championHorse && isFinal
              ? 'The room has spoken'
              : allDecided ? 'Results are in' : 'Now on the track' }}
          </p>
          <h2 class="r-title">{{ displayMeta?.name }}</h2>
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

      <section v-if="championHorse && isFinal" class="r-champ">
        <img :src="championHorse.img" :alt="championHorse.name" class="r-champ-photo" />
        <div class="r-champ-text">
          <div class="r-champ-eyebrow">🏆 Hottest Horse 🏆</div>
          <div class="r-champ-name">{{ championHorse.name }}</div>
          <div class="r-champ-sub">{{ championHorse.sub }}</div>
        </div>
      </section>

      <div v-if="!displayMatches.length" class="empty">
        The starting gates aren't open yet.
      </div>

      <ol v-else :class="gridClass">
        <li
          v-for="(match, i) in displayMatches"
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

        <div class="r-actions">
          <button
            v-if="canClose"
            class="navbtn primary"
            :disabled="busy"
            @click="closeModalOpen = true"
          >
            {{ isFinal ? 'Crown the winner 🏆' : 'Close voting' }}
          </button>

          <button
            v-else-if="allDecided && !isFinal && nextMeta"
            class="navbtn primary"
            :disabled="busy"
            @click="onAdvance"
          >
            Advance to {{ nextMeta.name }} →
          </button>

          <button
            v-else-if="allDecided && isFinal && championHorse"
            class="navbtn primary"
            :disabled="busy"
            @click="freshModalOpen = true"
          >
            Run it back 🐴
          </button>

          <span v-else class="r-waiting">Waiting on the room…</span>
        </div>
      </div>
    </div>

    <ConfirmModal
      :open="closeModalOpen"
      :busy="busy"
      emoji="🏇"
      :title="isFinal ? 'Cross the finish line?' : `Close voting for the ${displayMeta?.name}?`"
      :body="isFinal
        ? 'Every vote on every phone will be locked in and the Hottest Horse crowned. This one’s final — no photo finish reviews.'
        : 'Every vote in this round will be locked in for the whole room, the winners revealed, and their next matchups fed in. You can still linger on the results before advancing.'"
      safe-note="Your Hall of Fame is safe — this only locks the round."
      cancel-label="Neigh, wait"
      :confirm-label="isFinal ? 'Crown the winner 🏆' : 'Close voting 🏇'"
      busy-label="Locking in…"
      @cancel="closeModalOpen = false"
      @confirm="confirmClose"
    />

    <ConfirmModal
      :open="freshModalOpen"
      :busy="busy"
      emoji="🐴"
      title="Deal a fresh bracket?"
      body="Every phone in the room will start over from the Round of 16. This champion still takes home the roses — they'll live on in the Hall of Fame."
      safe-note="Past champions and all-time standings are safe."
      warn="Once the gates open on the new bracket, you can't put the old one back in the stall."
      cancel-label="Not just yet"
      confirm-label="Giddy up 🏇"
      busy-label="Dealing…"
      @cancel="freshModalOpen = false"
      @confirm="confirmFresh"
    />
  </template>
</template>
