-- Beta feedback form (/feedback). Anonymous: no IP, no session, no contact details.
CREATE TABLE feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  device     TEXT    NOT NULL,            -- mobile, desktop or both
  rating     INTEGER NOT NULL,            -- 1 to 5
  again      TEXT,                        -- yes, maybe or no
  problems   TEXT,
  ideas      TEXT,
  setup      TEXT,
  lang       TEXT,
  created_at TEXT    DEFAULT CURRENT_TIMESTAMP
);
