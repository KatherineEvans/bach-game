-- Let voters change their pick until the round is locked in. The INSERT-only
-- policy on votes stays put; changes go through this SECURITY DEFINER RPC so
-- there's no UPDATE policy exposed on the table itself. Validation mirrors
-- the validate_vote() BEFORE INSERT trigger — match must be open, and the
-- horse must be one of the two in the matchup.
CREATE OR REPLACE FUNCTION set_vote(
  p_match_id  uuid,
  p_horse_key text,
  p_client_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such match: %', p_match_id;
  END IF;
  IF NOT m.is_open THEN
    RAISE EXCEPTION 'voting is closed for round % slot %', m.round, m.slot;
  END IF;
  IF p_horse_key IS DISTINCT FROM m.horse_a_key
     AND p_horse_key IS DISTINCT FROM m.horse_b_key THEN
    RAISE EXCEPTION '% is not in round % slot %', p_horse_key, m.round, m.slot;
  END IF;

  -- INSERT ... ON CONFLICT swaps the horse_key when a device changes its
  -- pick. Bumping created_at is optional but keeps the row's timestamp
  -- honest about when the *current* pick was made.
  INSERT INTO votes (match_id, horse_key, client_id)
  VALUES (p_match_id, p_horse_key, p_client_id)
  ON CONFLICT (match_id, client_id) DO UPDATE
    SET horse_key  = EXCLUDED.horse_key,
        created_at = now();
END $$;

GRANT EXECUTE ON FUNCTION set_vote(uuid, text, text) TO anon, authenticated;
