<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const COLORS = ['#E8547C', '#C79A2B', '#1F4B3D', '#F2E2B4', '#fff']
const pieces = ref([])
let timer = null

onMounted(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  pieces.value = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}vw`,
    background: COLORS[Math.floor(Math.random() * COLORS.length)],
    animationDuration: `${2.2 + Math.random() * 1.6}s`,
    animationDelay: `${Math.random() * 0.6}s`,
    transform: `rotate(${Math.random() * 360}deg)`,
  }))

  timer = setTimeout(() => { pieces.value = [] }, 4200)
})

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div aria-hidden="true">
    <div v-for="p in pieces" :key="p.id" class="confetti-piece" :style="p" />
  </div>
</template>
