-- Throw away the votes in progress and deal a fresh bracket, KEEPING the
-- Hall of Fame. A bracket that already crowned a champion is history, so it
-- survives; only an unfinished one is discarded along with its votes.
CREATE OR REPLACE FUNCTION reset_votes() RETURNS uuid
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
CREATE OR REPLACE FUNCTION reset_all() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE app_state SET current_bracket_id = NULL WHERE id = 1;
  DELETE FROM brackets;   -- matches + votes cascade
  RETURN new_bracket();
END $$;

GRANT EXECUTE ON FUNCTION reset_votes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_all()   TO anon, authenticated;
