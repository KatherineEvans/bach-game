<script setup>
import { computed } from 'vue'
import ConfettiBurst from './ConfettiBurst.vue'
import { HORSES, ROUND_META } from '../data/horses.js'
import {
  champion, leaderboard, goTo, dealFreshBracket, busy, HALL_VIEW,
} from '../composables/useTournament.js'

const horse = computed(() => HORSES[champion.value])
const titles = computed(() => leaderboard.value.find((h) => h.key === champion.value)?.titles ?? 0)

function onRunItBack() {
  if (confirm('Deal a fresh bracket for everyone? This result stays in the Hall of Fame.')) {
    dealFreshBracket()
  }
}
</script>

<template>
  <ConfettiBurst />

  <div class="champion-screen">
    <p class="eyebrow2">The room has spoken —</p>
    <h2>🏆 Hottest Horse 🏆</h2>

    <div class="champ-frame">
      <img :src="horse.img" :alt="horse.name" />
    </div>

    <div class="champ-name">{{ horse.name }}</div>
    <div class="champ-sub">{{ horse.sub }}</div>
    <div v-if="titles > 1" class="champ-titles">
      {{ titles }}× champion of this bracket
    </div>

    <div class="roundnav">
      <button class="navbtn" @click="goTo(ROUND_META.length - 1)">← Back to Final</button>
      <button class="navbtn primary" :disabled="busy" @click="onRunItBack">
        Run it back 🐴
      </button>
    </div>

    <p class="saved-note">
      “Run it back” banks this result in the
      <button class="reset-link" @click="goTo(HALL_VIEW)">Hall of Fame</button>
      and deals a fresh bracket for every phone in the room.
    </p>
  </div>
</template>
