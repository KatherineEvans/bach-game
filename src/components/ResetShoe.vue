<script setup>
import { ref } from 'vue'
import ConfirmModal from './ConfirmModal.vue'
import { resetVotes, busy } from '../composables/useTournament.js'

const open = ref(false)

async function confirmReset() {
  await resetVotes()
  open.value = false
}
</script>

<template>
  <button
    class="shoe-btn"
    type="button"
    :disabled="busy"
    title="Start over — clears the votes in progress, keeps the Hall of Fame"
    aria-label="Start over — clears the votes in progress, keeps the Hall of Fame"
    @click="open = true"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 20.5 V11.5 a6.5 6.5 0 0 1 13 0 V20.5"
        fill="none"
        stroke="currentColor"
        stroke-width="3.4"
        stroke-linecap="round"
      />
      <circle cx="5.5" cy="18.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="5.5" cy="14.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="18.5" cy="18.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="18.5" cy="14.5" r=".75" fill="var(--cream-deep)" />
    </svg>
  </button>

  <ConfirmModal
    :open="open"
    :busy="busy"
    emoji="🐴"
    title="Hold your horses!"
    body="You're about to send this bracket back to the starting gates. Every vote in progress will get mucked out for everyone, on every phone, and a fresh Round of 16 hits the track."
    safe-note="Straight from the horse's mouth: your Hall of Fame is safe. Past champions keep their trophies and the all-time standings won't budge an inch."
    warn="No horsing around — once this bolts, you can't rein 'er back in."
    cancel-label="Neigh, forget it"
    confirm-label="Giddy up 🏇"
    busy-label="Mucking out…"
    @cancel="open = false"
    @confirm="confirmReset"
  />
</template>
