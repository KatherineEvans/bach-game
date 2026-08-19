<script setup>
import { computed } from 'vue'
import HorseCard from './HorseCard.vue'

const props = defineProps({
  match: { type: Object, required: true },
  index: { type: Number, required: true },
})

defineEmits(['pick'])

const ready = computed(() => Boolean(props.match.a && props.match.b))
const stateFor = (key) => {
  if (!props.match.winner) return ''
  return props.match.winner === key ? 'winner' : 'loser'
}
</script>

<template>
  <div class="match">
    <div class="matchlabel">Match {{ index + 1 }}</div>
    <div class="pair">
      <HorseCard
        :horse-key="match.a"
        :state="stateFor(match.a)"
        :pickable="ready"
        @pick="$emit('pick', $event)"
      />
      <div class="vs">vs</div>
      <HorseCard
        :horse-key="match.b"
        :state="stateFor(match.b)"
        :pickable="ready"
        @pick="$emit('pick', $event)"
      />
    </div>
  </div>
</template>
