CREATE TABLE maintenance_events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('PLANNED', 'EMERGENCY')),
  starts_at TIMESTAMPTZ NOT NULL,
  expected_recovery_at TIMESTAMPTZ NOT NULL,
  impact TEXT NOT NULL CHECK (BTRIM(impact) <> ''),
  contact TEXT NOT NULL CHECK (BTRIM(contact) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (expected_recovery_at > starts_at)
);

CREATE TABLE maintenance_notification_deliveries (
  maintenance_event_id UUID NOT NULL REFERENCES maintenance_events(id),
  phase TEXT NOT NULL CHECK (phase IN ('INITIAL', 'REMINDER', 'EMERGENCY')),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  provider_message_id TEXT,
  attempted_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  failure_code TEXT,
  PRIMARY KEY (maintenance_event_id, phase, recipient_user_id),
  CHECK ((status = 'SENT' AND sent_at IS NOT NULL AND failure_code IS NULL)
    OR (status = 'FAILED' AND sent_at IS NULL AND failure_code IS NOT NULL)
    OR (status = 'PENDING' AND sent_at IS NULL AND failure_code IS NULL))
);

