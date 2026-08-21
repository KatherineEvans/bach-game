<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  safeNote: { type: String, default: '' },
  warn: { type: String, default: '' },
  cancelLabel: { type: String, default: 'Nevermind' },
  confirmLabel: { type: String, default: 'Confirm' },
  busyLabel: { type: String, default: 'Working…' },
  emoji: { type: String, default: '🐴' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])

const cancelBtn = ref(null)

// Land focus on the safe option, and lock the page behind while it's up.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => cancelBtn.value?.focus())
      window.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      window.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

function onKeydown(e) {
  if (e.key === 'Escape' && !props.busy) emit('cancel')
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="!busy && emit('cancel')">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        aria-describedby="cm-body"
      >
        <div class="modal-shoe" aria-hidden="true">{{ emoji }}</div>
        <h2 id="cm-title">{{ title }}</h2>

        <div id="cm-body" class="modal-body">
          <p v-if="body">{{ body }}</p>
          <p v-if="safeNote" class="modal-safe">{{ safeNote }}</p>
          <p v-if="warn" class="modal-warn">{{ warn }}</p>
        </div>

        <div class="modal-actions">
          <button
            ref="cancelBtn"
            class="modal-btn cancel"
            type="button"
            :disabled="busy"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="modal-btn go"
            type="button"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ busy ? busyLabel : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
