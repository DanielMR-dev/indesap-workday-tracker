CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  worked_seconds INTEGER CHECK (worked_seconds IS NULL OR worked_seconds >= 0),
  CHECK ((ended_at IS NULL AND worked_seconds IS NULL) OR
         (ended_at IS NOT NULL AND worked_seconds IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_employee
  ON work_sessions(employee_id) WHERE ended_at IS NULL;
