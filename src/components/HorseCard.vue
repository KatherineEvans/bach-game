<script setup>
import { computed } from 'vue'
import { HORSES } from '../data/horses.js'

const props = defineProps({
  horseKey: { type: String, default: null },
  state: { type: String, default: '' }, // '' | 'winner' | 'loser'
  pickable: { type: Boolean, default: false },
  picked: { type: Boolean, default: false }, // this device voted for them
  votes: { type: Number, default: 0 },
  share: { type: Number, default: null }, // 0–100, or null to hide the tally
})

defineEmits(['pick'])

const horse = computed(() => (props.horseKey ? HORSES[props.horseKey] : null))
</script>

<template>
  <div v-if="!horse" class="horse tbd">
    <div class="photo-wrap">?</div>
    <div class="name">TBD</div>
    <div class="sub">Winner pending</div>
  </div>

  <component
    :is="pickable ? 'button' : 'div'"
    v-else
    :type="pickable ? 'button' : null"
    class="horse"
    :class="[state, { pickable, picked }]"
    :aria-pressed="pickable ? state === 'winner' : null"
    @click="pickable && $emit('pick', horseKey)"
  >
    <div class="photo-wrap">
      <img :src="horse.img" :alt="horse.name" loading="lazy" />
    </div>
    <div class="name">{{ horse.name }}</div>
    <div class="sub">{{ horse.sub }}</div>

    <div v-if="share !== null" class="tally">
      <div class="tally-bar"><span :style="{ width: `${share}%` }"></span></div>
      <div class="tally-num">
        {{ votes }} {{ votes === 1 ? 'vote' : 'votes' }} · {{ share }}%
      </div>
    </div>

    <div v-if="picked" class="your-pick">Your pick</div>

    <svg v-if="state === 'winner'" class="ribbon" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="24" r="18" fill="#C79A2B" stroke="#fff" stroke-width="2" />
      <path d="M20 38 L14 60 L32 50 L50 60 L44 38 Z" fill="#E8547C" />
      <circle cx="32" cy="24" r="10" fill="#F2E2B4" />
    </svg>
    <div v-else-if="state === 'loser'" class="eliminated-stamp">Neigh</div>
  </component>
</template>
