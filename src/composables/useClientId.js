const CLIENT_ID_KEY = 'hottest-horses:client_id'

/**
 * A stable per-device id. There's no auth — this plus the
 * UNIQUE (match_id, client_id) constraint in Postgres is what stops
 * one phone voting twice on the same matchup.
 *
 * Clearing site data gets you a new id and a second vote. That's fine
 * for a party bracket; it is not a security boundary.
 */
function load() {
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY)
    if (stored) return stored
  } catch {
    // Private browsing or storage disabled — fall through and generate one.
  }

  const fresh = crypto.randomUUID()
  try {
    localStorage.setItem(CLIENT_ID_KEY, fresh)
  } catch {
    // Best-effort: an in-memory id still works for this page load.
  }
  return fresh
}

export const clientId = load()
