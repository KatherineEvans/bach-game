<script setup>
import { computed } from 'vue'
import HorseCard from './HorseCard.vue'

const props = defineProps({
  match: { type: Object, required: true },
  index: { type: Number, required: true },
})

defineEmits(['vote'])

const ready = computed(() => Boolean(props.match.a && props.match.b))
// Both horses stay pickable while the round is open — tapping the other one
// swaps your vote. Only closes off once the host locks the round in.
const canVote = computed(() => ready.value && props.match.isOpen && !props.match.winner)

/**
 * Ribbon on the winner, "Neigh" on the loser — driven by YOUR pick the moment
 * you tap, so the card reacts immediately. Once the host locks the round in,
 * it switches to the room's actual winner, which may not be who you picked.
 * Running tallies live on the results page, not here.
 */
function stateFor(key) {
  const decided = props.match.winner ?? props.match.myPick
  if (!decided) return ''
  return decided === key ? 'winner' : 'loser'
}
</script>

<template>
  <div class="match" :class="{ decided: !!match.winner, voted: !!match.myPick }">
    <div class="matchlabel">Match {{ index + 1 }}</div>
    <div class="pair">
      <HorseCard
        :horse-key="match.a"
        :state="stateFor(match.a)"
        :pickable="canVote"
        @pick="$emit('vote', $event)"
      />
      <div class="vs">vs</div>
      <HorseCard
        :horse-key="match.b"
        :state="stateFor(match.b)"
        :pickable="canVote"
        @pick="$emit('vote', $event)"
      />
    </div>
  </div>
</template>
