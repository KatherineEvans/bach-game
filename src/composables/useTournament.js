import { computed } from 'vue'
import { HORSES, HORSE_KEYS, SEED, ROUND_META } from '../data/horses.js'
import { useStoredRef, clearStored } from './useStorage.js'

const BRACKET_KEY = 'hottest-horses:bracket:v1'
const RUNS_KEY = 'hottest-horses:runs:v1'

export const CHAMPION_VIEW = ROUND_META.length
export const HALL_VIEW = ROUND_META.length + 1

function freshBracket() {
  const rounds = [SEED.map(([a, b]) => ({ a, b, winner: null }))]
  for (let len = SEED.length / 2; len >= 1; len /= 2) {
    rounds.push(Array.from({ length: len }, () => ({ a: null, b: null, winner: null })))
  }
  return { rounds, champion: null, viewIdx: 0 }
}

// A saved bracket from an older/edited build shouldn't be able to wedge the app.
function isValidBracket(value) {
  if (!value || !Array.isArray(value.rounds)) return false
  const shape = freshBracket().rounds
  if (value.rounds.length !== shape.length) return false
  const known = (k) => k === null || Object.hasOwn(HORSES, k)
  return value.rounds.every((round, i) =>
    Array.isArray(round) &&
    round.length === shape[i].length &&
    round.every((m) => m && known(m.a) && known(m.b) && known(m.winner)),
  )
}

// --- persisted state (module-level, so every component shares one tournament) ---

const bracket = useStoredRef(BRACKET_KEY, freshBracket())
if (!isValidBracket(bracket.value)) bracket.value = freshBracket()

/**
 * Every completed bracket, archived:
 *   { finishedAt, champion, picks: [{ round, winner, loser }] }
 * The live bracket is *not* in here — the leaderboard layers it on top so
 * changing your mind mid-run just moves the vote instead of double-counting it.
 */
const runs = useStoredRef(RUNS_KEY, [])
if (!Array.isArray(runs.value)) runs.value = []

// --- derived ---

export const rounds = computed(() => bracket.value.rounds)
export const champion = computed(() => bracket.value.champion)
export const viewIdx = computed(() => bracket.value.viewIdx)

export function roundComplete(r) {
  return bracket.value.rounds[r].every((m) => m.winner)
}

export function roundUnlocked(r) {
  return r === 0 || roundComplete(r - 1)
}

/** Decided matches in the live bracket, in vote-log form. */
const livePicks = computed(() =>
  bracket.value.rounds.flatMap((round, r) =>
    round
      .filter((m) => m.winner)
      .map((m) => ({ round: r, winner: m.winner, loser: m.winner === m.a ? m.b : m.a })),
  ),
)

export const hasStarted = computed(() => livePicks.value.length > 0)

/** All-time standings: archived runs + whatever's decided right now. */
export const leaderboard = computed(() => {
  const tally = Object.fromEntries(
    HORSE_KEYS.map((key) => [key, { key, ...HORSES[key], wins: 0, matchups: 0, titles: 0 }]),
  )

  const count = (picks, champ) => {
    for (const { winner, loser } of picks) {
      if (tally[winner]) { tally[winner].wins++; tally[winner].matchups++ }
      if (tally[loser]) tally[loser].matchups++
    }
    if (champ && tally[champ]) tally[champ].titles++
  }

  for (const run of runs.value) count(run.picks ?? [], run.champion)
  count(livePicks.value, bracket.value.champion)

  return Object.values(tally).sort(
    (a, b) =>
      b.titles - a.titles ||
      b.wins - a.wins ||
      b.matchups - a.matchups ||
      a.name.localeCompare(b.name),
  )
})

export const completedRuns = computed(() => [...runs.value].reverse())
export const totalVotes = computed(
  () => runs.value.reduce((n, run) => n + (run.picks?.length ?? 0), 0) + livePicks.value.length,
)

// --- actions ---

/** Clear a match's winner and cascade the removal down the bracket. */
function resetFrom(r, m) {
  const { rounds } = bracket.value
  rounds[r][m].winner = null
  if (r + 1 >= rounds.length) {
    bracket.value.champion = null
    return
  }
  const nm = Math.floor(m / 2)
  const next = rounds[r + 1][nm]
  next[m % 2 === 0 ? 'a' : 'b'] = null
  if (next.winner) resetFrom(r + 1, nm)
}

export function pickWinner(r, m, key) {
  const { rounds } = bracket.value
  const match = rounds[r][m]
  if (!match.a || !match.b) return
  if (match.winner === key) return

  match.winner = key

  if (r + 1 < rounds.length) {
    const nm = Math.floor(m / 2)
    const next = rounds[r + 1][nm]
    const slot = m % 2 === 0 ? 'a' : 'b'
    if (next[slot] !== key) {
      next[slot] = key
      // The horse that used to hold this slot may have already won onward —
      // tear that branch down rather than leave a ghost in the bracket.
      if (next.winner && next.winner !== next.a && next.winner !== next.b) {
        resetFrom(r + 1, nm)
      }
    }
  } else {
    bracket.value.champion = key
  }

  // Deliberately no auto-advance: finishing a round leaves you on it so you
  // can review or change picks. Moving on is always the "Next" button.
}

export function goTo(i) {
  bracket.value.viewIdx = i
}

/** Bank the finished bracket into the all-time record and deal a new one. */
export function archiveAndRestart() {
  if (bracket.value.champion) {
    runs.value = [
      ...runs.value,
      {
        finishedAt: new Date().toISOString(),
        champion: bracket.value.champion,
        picks: livePicks.value,
      },
    ]
  }
  bracket.value = freshBracket()
}

/** Throw away the current bracket without recording it. */
export function resetBracket() {
  bracket.value = freshBracket()
}

/** Wipe everything, including the all-time leaderboard. */
export function clearAllVotes() {
  runs.value = []
  bracket.value = freshBracket()
  clearStored(BRACKET_KEY)
  clearStored(RUNS_KEY)
}
