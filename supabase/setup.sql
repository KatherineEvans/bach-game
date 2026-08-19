-- ============================================================
-- The Hottest Horse Invitational — Supabase setup
-- Run this in the Supabase SQL Editor in a fresh project.
-- Idempotent: drops & recreates everything on each run.
--
-- Model: ONE shared crowd bracket. Everyone votes on the same
-- matchups; the tally decides who advances. Later rounds are
-- empty rows until an earlier round closes and feeds them.
-- ============================================================

-- 0. Drop existing objects (children first)
DROP FUNCTION IF EXISTS reset_all()                CASCADE;
DROP FUNCTION IF EXISTS reset_votes()              CASCADE;
DROP FUNCTION IF EXISTS close_round(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS close_match(uuid)          CASCADE;
DROP FUNCTION IF EXISTS new_bracket()              CASCADE;
DROP FUNCTION IF EXISTS validate_vote()            CASCADE;
DROP VIEW     IF EXISTS horse_standings            CASCADE;
DROP VIEW     IF EXISTS match_vote_counts          CASCADE;
DROP TABLE    IF EXISTS votes                      CASCADE;
DROP TABLE    IF EXISTS matches                    CASCADE;
DROP TABLE    IF EXISTS app_state                  CASCADE;
DROP TABLE    IF EXISTS brackets                   CASCADE;
DROP TABLE    IF EXISTS seed_pairings              CASCADE;
DROP TABLE    IF EXISTS horses                     CASCADE;

-- ============================================================
-- 1. Reference data
--    Photos stay as Vite imports in src/data/horses.js, keyed by
--    horse_key — same split as fighters-app (art in JS, rows in DB).
-- ============================================================

CREATE TABLE horses (
  horse_key  text        PRIMARY KEY,
  name       text        NOT NULL,
  sub        text,
  is_active  boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The opening field, in bracket order. new_bracket() reads this, so
-- re-seeding the tournament is a data change, not a code change.
CREATE TABLE seed_pairings (
  slot        integer PRIMARY KEY,
  horse_a_key text NOT NULL REFERENCES horses(horse_key),
  horse_b_key text NOT NULL REFERENCES horses(horse_key)
);

-- ============================================================
-- 2. Tournament tables
-- ============================================================

-- One tournament run. "Run it back" inserts a new row rather than
-- wiping anything, so the Hall of Fame accumulates across brackets.
CREATE TABLE brackets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status       text        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open','finished')),
  champion_key text        REFERENCES horses(horse_key),
  created_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);

-- The tree. round 0 = Round of 16 … round 3 = The Final.
-- horse_a/b are NULL in rounds 1+ until fed by close_match().
CREATE TABLE matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id  uuid        NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  round       integer     NOT NULL,
  slot        integer     NOT NULL,
  horse_a_key text        REFERENCES horses(horse_key),
  horse_b_key text        REFERENCES horses(horse_key),
  -- Locked in when the match closes, tie-break included: rolled ONCE
  -- server-side so every device sees the same winner.
  winner_key  text        REFERENCES horses(horse_key),
  is_open     boolean     NOT NULL DEFAULT false,
  closed_at   timestamptz,
  UNIQUE (bracket_id, round, slot)
);

CREATE INDEX matches_bracket_idx ON matches (bracket_id, round, slot);

-- One vote per device per match — the unique constraint IS the
-- anti-double-vote mechanism, exactly as in fighters-app.
CREATE TABLE votes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  horse_key  text        NOT NULL REFERENCES horses(horse_key),
  client_id  text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, client_id)
);

CREATE INDEX votes_match_idx ON votes (match_id);

-- Realtime DELETE events default to PK-only payloads, so a per-match
-- filter never matches on delete. Send the full old row instead.
ALTER TABLE votes REPLICA IDENTITY FULL;

-- Single-row pointer at the live bracket, so a host starting a new one
-- pushes every device over via realtime.
CREATE TABLE app_state (
  id                 integer     PRIMARY KEY CHECK (id = 1),
  current_bracket_id uuid        REFERENCES brackets(id) ON DELETE SET NULL,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Vote integrity
--    Anon can INSERT votes, so the rules live in the DB rather than
--    trusting the client: the match must be open, and you must vote
--    for one of ITS two horses.
-- ============================================================

CREATE FUNCTION validate_vote() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE m matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM matches WHERE id = NEW.match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such match: %', NEW.match_id;
  END IF;
  IF NOT m.is_open THEN
    RAISE EXCEPTION 'voting is closed for round % slot %', m.round, m.slot;
  END IF;
  IF NEW.horse_key IS DISTINCT FROM m.horse_a_key
     AND NEW.horse_key IS DISTINCT FROM m.horse_b_key THEN
    RAISE EXCEPTION '% is not in round % slot %', NEW.horse_key, m.round, m.slot;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER votes_validate
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION validate_vote();

-- ============================================================
-- 4. Derived tallies
--    Standings are COMPUTED, never incremented — the property the
--    localStorage version deliberately had. Changing a result moves
--    the count instead of double-counting it.
-- ============================================================

CREATE VIEW match_vote_counts AS
  SELECT match_id, horse_key, count(*)::int AS votes
  FROM votes
  GROUP BY match_id, horse_key;

CREATE VIEW horse_standings AS
  SELECT
    h.horse_key,
    h.name,
    h.sub,
    count(m.id) FILTER (WHERE m.winner_key = h.horse_key)   AS wins,
    -- Decided matches only. A horse seeded into a match nobody has voted
    -- on yet hasn't had a matchup, and counting it would drag its win
    -- rate down for the whole round.
    count(m.id) FILTER (WHERE m.winner_key IS NOT NULL)      AS matchups,
    count(DISTINCT b.id) FILTER (WHERE b.champion_key = h.horse_key) AS titles
  FROM horses h
  LEFT JOIN matches m
    ON h.horse_key IN (m.horse_a_key, m.horse_b_key)
  LEFT JOIN brackets b
    ON b.id = m.bracket_id
  GROUP BY h.horse_key, h.name, h.sub;

-- ============================================================
-- 5. Host actions
--    SECURITY DEFINER so the anon key can call them without being
--    granted UPDATE on the tables. The admin gate is a frontend
--    password (visible in the bundle) — deterrence, not security.
-- ============================================================

-- Deal a fresh bracket from seed_pairings and point app_state at it.
-- Returns the new bracket id.
CREATE FUNCTION new_bracket() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bracket_id uuid;
  v_round      integer := 1;
  v_slots      integer;
BEGIN
  INSERT INTO brackets DEFAULT VALUES RETURNING id INTO v_bracket_id;

  -- Round 0 comes straight from the seed and opens immediately.
  INSERT INTO matches (bracket_id, round, slot, horse_a_key, horse_b_key, is_open)
  SELECT v_bracket_id, 0, slot, horse_a_key, horse_b_key, true
  FROM seed_pairings;

  -- Empty rows for every later round, halving each time.
  SELECT count(*) / 2 INTO v_slots FROM seed_pairings;
  WHILE v_slots >= 1 LOOP
    INSERT INTO matches (bracket_id, round, slot)
    SELECT v_bracket_id, v_round, s FROM generate_series(0, v_slots - 1) AS s;
    v_round := v_round + 1;
    v_slots := v_slots / 2;
  END LOOP;

  INSERT INTO app_state (id, current_bracket_id, updated_at)
  VALUES (1, v_bracket_id, now())
  ON CONFLICT (id) DO UPDATE
    SET current_bracket_id = EXCLUDED.current_bracket_id,
        updated_at         = now();

  RETURN v_bracket_id;
END $$;

-- Lock in a match: tally, pick the winner, feed the next round.
-- Idempotent — calling it twice returns the same winner.
CREATE FUNCTION close_match(p_match_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m           matches%ROWTYPE;
  v_next      matches%ROWTYPE;
  v_winner    text;
  v_max_round integer;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such match: %', p_match_id;
  END IF;
  IF m.winner_key IS NOT NULL THEN
    RETURN m.winner_key;
  END IF;
  IF m.horse_a_key IS NULL OR m.horse_b_key IS NULL THEN
    RAISE EXCEPTION 'round % slot % is not filled in yet', m.round, m.slot;
  END IF;

  -- Most votes wins; random() breaks ties, rolled once, right here.
  SELECT horse_key INTO v_winner
  FROM votes
  WHERE match_id = p_match_id
    AND horse_key IN (m.horse_a_key, m.horse_b_key)
  GROUP BY horse_key
  ORDER BY count(*) DESC, random()
  LIMIT 1;

  -- Nobody voted at all: coin-flip rather than wedge the bracket.
  IF v_winner IS NULL THEN
    v_winner := (ARRAY[m.horse_a_key, m.horse_b_key])[1 + floor(random() * 2)::int];
  END IF;

  UPDATE matches
  SET winner_key = v_winner, is_open = false, closed_at = now()
  WHERE id = p_match_id;

  SELECT max(round) INTO v_max_round FROM matches WHERE bracket_id = m.bracket_id;

  IF m.round >= v_max_round THEN
    UPDATE brackets
    SET champion_key = v_winner, status = 'finished', finished_at = now()
    WHERE id = m.bracket_id;
  ELSE
    -- Winner of slot N feeds slot N/2 of the next round: side A if N is
    -- even, side B if odd — the same halving the JS bracket used.
    UPDATE matches
    SET horse_a_key = CASE WHEN m.slot % 2 = 0 THEN v_winner ELSE horse_a_key END,
        horse_b_key = CASE WHEN m.slot % 2 = 1 THEN v_winner ELSE horse_b_key END
    WHERE bracket_id = m.bracket_id
      AND round = m.round + 1
      AND slot  = m.slot / 2
    RETURNING * INTO v_next;

    -- Both sides in: that match is now votable.
    IF v_next.horse_a_key IS NOT NULL AND v_next.horse_b_key IS NOT NULL THEN
      UPDATE matches SET is_open = true WHERE id = v_next.id;
    END IF;
  END IF;

  RETURN v_winner;
END $$;

-- Close every still-open match in a round at once (the host's
-- "lock in this round" button). Returns how many it closed.
CREATE FUNCTION close_round(p_bracket_id uuid, p_round integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r     record;
  v_n   integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM matches
    WHERE bracket_id = p_bracket_id AND round = p_round AND winner_key IS NULL
    ORDER BY slot
  LOOP
    PERFORM close_match(r.id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

-- Throw away the votes in progress and deal a fresh bracket, KEEPING the
-- Hall of Fame. A bracket that already crowned a champion is history, so it
-- survives; only an unfinished one is discarded along with its votes.
CREATE FUNCTION reset_votes() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM brackets b
  USING app_state s
  WHERE s.id = 1
    AND b.id = s.current_bracket_id
    AND b.status = 'open';   -- matches + votes cascade
  RETURN new_bracket();
END $$;

-- Wipe every bracket and vote ever recorded, then deal a fresh one.
-- Anon has no DELETE rights by design, so a full reset has to come
-- through here. Useful for clearing test votes before the real thing.
CREATE FUNCTION reset_all() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE app_state SET current_bracket_id = NULL WHERE id = 1;
  DELETE FROM brackets;   -- matches + votes cascade
  RETURN new_bracket();
END $$;

-- ============================================================
-- 6. Realtime
--    Every view streams changes instead of polling.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE brackets;
ALTER PUBLICATION supabase_realtime ADD TABLE app_state;

-- ============================================================
-- 7. Row Level Security
--    Public read, insert-only on votes. Nothing anonymous can
--    UPDATE or DELETE — advancing the bracket only happens through
--    the SECURITY DEFINER functions above.
-- ============================================================

ALTER TABLE horses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brackets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state     ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_horses    ON horses        FOR SELECT USING (true);
CREATE POLICY read_seed      ON seed_pairings FOR SELECT USING (true);
CREATE POLICY read_brackets  ON brackets      FOR SELECT USING (true);
CREATE POLICY read_matches   ON matches       FOR SELECT USING (true);
CREATE POLICY read_votes     ON votes         FOR SELECT USING (true);
CREATE POLICY read_app_state ON app_state     FOR SELECT USING (true);

CREATE POLICY insert_votes   ON votes         FOR INSERT WITH CHECK (true);

GRANT SELECT ON match_vote_counts, horse_standings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION new_bracket()             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION close_match(uuid)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION close_round(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_votes()              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_all()                TO anon, authenticated;

-- ============================================================
-- 8. Seed the field (mirrors src/data/horses.js)
-- ============================================================

INSERT INTO horses (horse_key, name, sub, sort_order) VALUES
  ('spirit',      'Spirit',          'Spirit: Stallion of the Cimarron',  1),
  ('maximus',     'Maximus',         'Tangled',                           2),
  ('pegasus',     'Pegasus',         'Hercules',                          3),
  ('samson',      'Samson',          'Sleeping Beauty',                   4),
  ('khan',        'Khan',            'Mulan',                             5),
  ('achilles',    'Achilles',        'The Hunchback of Notre Dame',       6),
  ('artax',       'Artax',           'The NeverEnding Story',             7),
  ('altivo',      'Altivo',          'The Road to El Dorado',             8),
  ('angus',       'Angus',           'Brave',                             9),
  ('bullseye',    'Bullseye',        'Toy Story',                        10),
  ('froufrou',    'Frou-Frou',       'The Aristocats',                   11),
  ('phillipe',    'Philippe',        'Beauty and the Beast',             12),
  ('bojack',      'BoJack Horseman', 'BoJack Horseman',                  13),
  ('pokey',       'Pokey',           'Gumby',                            14),
  ('shadowfax',   'Shadowfax',       'The Lord of the Rings',            15),
  ('blackbeauty', 'Black Beauty',    'Black Beauty',                     16);

-- Opening matchups, in bracket order (mirrors SEED).
INSERT INTO seed_pairings (slot, horse_a_key, horse_b_key) VALUES
  (0, 'maximus',     'samson'),
  (1, 'khan',        'phillipe'),
  (2, 'pegasus',     'artax'),
  (3, 'shadowfax',   'spirit'),
  (4, 'bullseye',    'froufrou'),
  (5, 'altivo',      'angus'),
  (6, 'bojack',      'pokey'),
  (7, 'blackbeauty', 'achilles');

-- ============================================================
-- 9. Deal the first bracket
-- ============================================================
SELECT new_bracket();
