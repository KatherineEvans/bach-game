import { computed, ref } from 'vue'
import { supabase } from '../lib/supabaseClient.js'
import { HORSES, HORSE_KEYS, ROUND_META } from '../data/horses.js'
import { useStoredRef } from './useStorage.js'
import { clientId } from './useClientId.js'

export const CHAMPION_VIEW = ROUND_META.length
export const HALL_VIEW = ROUND_META.length + 1

// --- shared state -----------------------------------------------------------
// Module-level, so every component reads one tournament. The bracket now lives
// in Postgres; these refs are a local mirror kept fresh by realtime.

const bracketRow = ref(null) //  the live bracket
const matchRows = ref([]) //    its matches
const countRows = ref([]) //    match_vote_counts, this bracket only
const myVoteRows = ref([]) //   this device's votes
const standingRows = ref([]) // horse_standings, all time
const finishedRows = ref([]) // past champions
const totalVoteCount = ref(0)

export const loading = ref(true)
export const error = ref(null)
export const busy = ref(false) // a host action is in flight

// Bumped each time the /results page taps "Advance to next round". Every
// device gets the bump via supabase broadcast, so the /vote page knows to
// unlock its own "Advance" button once (and only once) the host has moved on.
export const advanceEpoch = ref(0)

// Which round you're LOOKING at stays per-device — it's UI state, not a result.
export const viewIdx = useStoredRef('hottest-horses:view:v2', 0)

// The tally sheet shown between one round and the next. Holds a round index
// while it's on screen, null while you're voting.
export const resultsRound = ref(null)

// --- loading ----------------------------------------------------------------

function fail(e) {
  error.value = e?.message ?? String(e)
  return null
}

async function refreshBracket() {
  const { data: state, error: e1 } = await supabase
    .from('app_state')
    .select('current_bracket_id')
    .eq('id', 1)
    .maybeSingle()
  if (e1) return fail(e1)

  const id = state?.current_bracket_id
  if (!id) {
    bracketRow.value = null
    matchRows.value = []
    return fail(new Error('No bracket has been dealt yet — run supabase/setup.sql.'))
  }

  const [{ data: bracket, error: e2 }, { data: matches, error: e3 }] = await Promise.all([
    supabase.from('brackets').select('*').eq('id', id).maybeSingle(),
    supabase.from('matches').select('*').eq('bracket_id', id).order('round').order('slot'),
  ])
  if (e2) return fail(e2)
  if (e3) return fail(e3)

  bracketRow.value = bracket
  matchRows.value = matches ?? []
}

async function refreshVotes() {
  const ids = matchRows.value.map((m) => m.id)
  if (!ids.length) {
    countRows.value = []
    myVoteRows.value = []
    return
  }

  const [counts, mine, total] = await Promise.all([
    supabase.from('match_vote_counts').select('match_id,horse_key,votes').in('match_id', ids),
    supabase.from('votes').select('match_id,horse_key').eq('client_id', clientId).in('match_id', ids),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
  ])

  if (counts.error) return fail(counts.error)
  countRows.value = counts.data ?? []
  if (!mine.error) myVoteRows.value = mine.data ?? []
  if (!total.error) totalVoteCount.value = total.count ?? 0
}

async function refreshStandings() {
  const [standings, finished] = await Promise.all([
    supabase.from('horse_standings').select('*'),
    supabase
      .from('brackets')
      .select('id,champion_key,finished_at')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false }),
  ])
  if (!standings.error) standingRows.value = standings.data ?? []
  if (!finished.error) finishedRows.value = finished.data ?? []
}

async function loadAll() {
  await refreshBracket()
  await Promise.all([refreshVotes(), refreshStandings()])
  loading.value = false
}

// --- realtime ---------------------------------------------------------------
// Every device streams changes instead of polling. Votes land in bursts when a
// room of people taps at once, so those refreshes are coalesced.

/** Collapse a burst of events into one refresh. */
function debounce(fn, ms) {
  let timer = null
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

// A room tapping at once produces a burst of vote rows; locking in a round
// updates all 8 matches at once. Coalesce both rather than refetching per event.
const scheduleVoteRefresh = debounce(refreshVotes, 150)
const scheduleBracketRefresh = debounce(async () => {
  await refreshBracket()
  await Promise.all([refreshVotes(), refreshStandings()])
}, 250)

let channel = null
function subscribe() {
  if (channel) return
  const on = (table, handler) =>
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, handler)

  channel = supabase.channel('hottest-horses')
  on('votes', scheduleVoteRefresh)
  on('matches', scheduleBracketRefresh)
  on('brackets', scheduleBracketRefresh)
  // A host dealing a fresh bracket repoints app_state — everyone follows.
  on('app_state', loadAll)
  // Cross-device "advance" signal from /results. `self: false` is the default,
  // so the sender bumps its own epoch manually in broadcastAdvance().
  channel.on('broadcast', { event: 'advance' }, () => {
    advanceEpoch.value += 1
  })
  channel.subscribe()
}

loadAll()
subscribe()

// --- derived ----------------------------------------------------------------

const countsByMatch = computed(() => {
  const map = {}
  for (const row of countRows.value) {
    ;(map[row.match_id] ??= {})[row.horse_key] = row.votes
  }
  return map
})

const myPickByMatch = computed(() =>
  Object.fromEntries(myVoteRows.value.map((v) => [v.match_id, v.horse_key])),
)

/**
 * The bracket in the shape the components already speak: rounds[r][slot] with
 * `a` / `b` / `winner` keys, plus the live tally and this device's pick.
 */
export const rounds = computed(() => {
  const out = []
  for (const m of matchRows.value) {
    const counts = countsByMatch.value[m.id] ?? {}
    out[m.round] ??= []
    out[m.round][m.slot] = {
      id: m.id,
      a: m.horse_a_key,
      b: m.horse_b_key,
      winner: m.winner_key,
      isOpen: m.is_open,
      counts,
      total: (counts[m.horse_a_key] ?? 0) + (counts[m.horse_b_key] ?? 0),
      myPick: myPickByMatch.value[m.id] ?? null,
    }
  }
  return out
})

export const champion = computed(() => bracketRow.value?.champion_key ?? null)

/**
 * The round the room is voting on right now — first with any undecided
 * matchup. If every round is decided, holds on the final so the champion
 * splash makes sense next to the final tile.
 */
export const liveRound = computed(() => {
  const rs = rounds.value
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]
    if (!r?.length) continue
    if (r.some((m) => !m?.winner)) return i
  }
  return Math.max(0, rs.length - 1)
})

export function roundComplete(r) {
  const round = rounds.value[r]
  return Boolean(round?.length) && round.every((m) => m?.winner)
}

export function roundUnlocked(r) {
  return r === 0 || roundComplete(r - 1)
}

/** Every match filled in and still undecided — the host can lock it in. */
export function roundLockable(r) {
  const round = rounds.value[r]
  return Boolean(round?.length) && round.every((m) => m?.a && m?.b && !m.winner)
}

export const hasStarted = computed(
  () => totalVoteCount.value > 0 || matchRows.value.some((m) => m.winner_key),
)

/** All-time standings, computed by the database from every bracket ever run. */
export const leaderboard = computed(() => {
  const byKey = Object.fromEntries(standingRows.value.map((r) => [r.horse_key, r]))
  return HORSE_KEYS.map((key) => {
    const row = byKey[key] ?? {}
    return {
      key,
      ...HORSES[key],
      wins: row.wins ?? 0,
      matchups: row.matchups ?? 0,
      titles: row.titles ?? 0,
    }
  }).sort(
    (a, b) =>
      b.titles - a.titles ||
      b.wins - a.wins ||
      b.matchups - a.matchups ||
      a.name.localeCompare(b.name),
  )
})

export const completedRuns = computed(() =>
  finishedRows.value.map((b) => ({ finishedAt: b.finished_at, champion: b.champion_key })),
)

export const totalVotes = computed(() => totalVoteCount.value)

// --- actions ----------------------------------------------------------------

export function goTo(i) {
  resultsRound.value = null
  viewIdx.value = i
}

/** Show the tally sheet for a finished round. */
export function goToResults(r) {
  viewIdx.value = r
  resultsRound.value = r
}

/**
 * Cast (or swap) this device's vote on a match. Voters can change their
 * pick until the round is locked in by the host; the DB's set_vote RPC
 * upserts on (match_id, client_id) so the row moves rather than double-counts.
 * Optimistic so the tally reflects the tap immediately; realtime then
 * reconciles with everyone else's votes.
 */
export async function castVote(roundIndex, slotIndex, horseKey) {
  const match = rounds.value[roundIndex]?.[slotIndex]
  if (!match || !match.isOpen || match.winner) return
  if (match.myPick === horseKey) return // already picked this horse

  const prev = match.myPick

  myVoteRows.value = [
    ...myVoteRows.value.filter((v) => v.match_id !== match.id),
    { match_id: match.id, horse_key: horseKey },
  ]

  countRows.value = [...countRows.value]
  if (prev) {
    const prevRow = countRows.value.find(
      (r) => r.match_id === match.id && r.horse_key === prev,
    )
    if (prevRow) prevRow.votes = Math.max(0, prevRow.votes - 1)
  }
  const nextRow = countRows.value.find(
    (r) => r.match_id === match.id && r.horse_key === horseKey,
  )
  if (nextRow) nextRow.votes += 1
  else countRows.value.push({ match_id: match.id, horse_key: horseKey, votes: 1 })

  const { error: e } = await supabase.rpc('set_vote', {
    p_match_id: match.id,
    p_horse_key: horseKey,
    p_client_id: clientId,
  })

  if (e) {
    fail(e)
    await refreshVotes() // undo the optimistic swap
  }
}

async function hostAction(fn) {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    const { error: e } = await fn()
    if (e) fail(e)
    await loadAll()
  } finally {
    busy.value = false
  }
}

/** Tally every match in the round, crown the winners, feed the next round. */
export function lockInRound(roundIndex) {
  return hostAction(() =>
    supabase.rpc('close_round', {
      p_bracket_id: bracketRow.value?.id,
      p_round: roundIndex,
    }),
  )
}

/** Bank the finished bracket and deal a new one. Standings carry over. */
export function dealFreshBracket() {
  return hostAction(() => supabase.rpc('new_bracket'))
}

/**
 * Tell every other device that /results just advanced past a round. Called
 * from ResultsView after the "Advance" or "Run it back" tap — /vote listens
 * on the same channel to unlock its own advance button.
 */
export function broadcastAdvance() {
  advanceEpoch.value += 1 // self doesn't receive its own broadcast
  channel?.send({ type: 'broadcast', event: 'advance', payload: {} })
}

/**
 * Throw away the voting in progress and deal a fresh bracket, keeping the
 * Hall of Fame. A bracket that already crowned a champion is left alone —
 * it's history — so only unfinished votes are discarded.
 */
export function resetVotes() {
  return hostAction(() => supabase.rpc('reset_votes'))
}

/**
 * The nuclear option: erase every bracket and vote ever recorded, Hall of
 * Fame included. Not wired to any button — call it from the console, or ask
 * for a UI for it.
 */
export function wipeEverything() {
  return hostAction(() => supabase.rpc('reset_all'))
}
