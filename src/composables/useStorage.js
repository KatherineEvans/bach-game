import { ref, watch } from 'vue'

/**
 * A ref that mirrors itself into localStorage under `key`.
 * Falls back to plain in-memory state if storage is unavailable
 * (private browsing, file:// in some browsers, quota exceeded).
 */
export function useStoredRef(key, fallback) {
  const state = ref(read(key, fallback))

  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (err) {
        console.warn(`[hottest-horses] could not persist "${key}"`, err)
      }
    },
    { deep: true },
  )

  return state
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return parsed === null || parsed === undefined ? fallback : parsed
  } catch (err) {
    console.warn(`[hottest-horses] could not read "${key}", starting fresh`, err)
    return fallback
  }
}

export function clearStored(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to do */
  }
}
