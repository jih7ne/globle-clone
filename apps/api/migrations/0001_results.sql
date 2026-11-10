-- One row per finished game (specification, section 9).
CREATE TABLE results (
  date        TEXT    NOT NULL,            -- YYYY-MM-DD, player's local date
  session_id  TEXT    NOT NULL,            -- anonymous UUID generated on the client
  guesses     INTEGER NOT NULL,            -- read from the signed token
  won         INTEGER NOT NULL,            -- 0 or 1, computed by the server
  first_guess TEXT,                        -- ISO code of the first guess
  duration_ms INTEGER NOT NULL,            -- between /start and /finish
  suspect     INTEGER NOT NULL DEFAULT 0,  -- 1 = left out of global stats
  created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, session_id)
);
