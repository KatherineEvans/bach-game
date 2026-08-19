<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { resetVotes, busy } from '../composables/useTournament.js'

const open = ref(false)
const cancelBtn = ref(null)

function show() {
  open.value = true
  // Land focus on the safe option, not the one that wipes the bracket.
  nextTick(() => cancelBtn.value?.focus())
}

function close() {
  open.value = false
}

async function confirmReset() {
  await resetVotes()
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

// Escape closes it, and the page behind shouldn't scroll while it's up.
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <button
    class="shoe-btn"
    type="button"
    :disabled="busy"
    title="Start over — clears the votes in progress, keeps the Hall of Fame"
    aria-label="Start over — clears the votes in progress, keeps the Hall of Fame"
    @click="show"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <!-- The shoe itself: up the left branch, over the top, down the right. -->
      <path
        d="M5.5 20.5 V11.5 a6.5 6.5 0 0 1 13 0 V20.5"
        fill="none"
        stroke="currentColor"
        stroke-width="3.4"
        stroke-linecap="round"
      />
      <!-- Nail holes, punched in the page colour so they read as holes. -->
      <circle cx="5.5" cy="18.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="5.5" cy="14.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="18.5" cy="18.5" r=".75" fill="var(--cream-deep)" />
      <circle cx="18.5" cy="14.5" r=".75" fill="var(--cream-deep)" />
    </svg>
  </button>

  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="close">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-body"
      >
        <div class="modal-shoe" aria-hidden="true">🐴</div>
        <h2 id="reset-title">Hold your horses!</h2>

        <div id="reset-body" class="modal-body">
          <p>
            You're about to send this bracket back to the starting gates. Every
            vote in progress will get mucked out for everyone, on every phone, 
            and a fresh 'Round of 16' hits the track.
          </p>
          <p class="modal-safe">
            <p>Straight from the horse's mouth:</p>
            <p>Your <b>Hall of Fame is safe</b>.</p>
            <p>
              Past champions keep their trophies and the all-time standings
              won't budge an inch.
            </p>
          </p>
          <p class="modal-warn">
            No horsing around: once this bolts, you can't rein 'er back in. (Once you reset the brackets, you can't undo it!)
          </p>
        </div>

        <div class="modal-actions">
          <button ref="cancelBtn" class="modal-btn cancel" type="button" @click="close">
            Neigh, forget it
          </button>
          <button class="modal-btn go" type="button" :disabled="busy" @click="confirmReset">
            {{ busy ? 'Mucking out…' : 'Giddy up 🏇' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
