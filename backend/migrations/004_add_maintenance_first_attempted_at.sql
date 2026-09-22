ALTER TABLE maintenance_notification_deliveries
  ADD COLUMN first_attempted_at TIMESTAMPTZ;

UPDATE maintenance_notification_deliveries
SET first_attempted_at = attempted_at
WHERE first_attempted_at IS NULL;

ALTER TABLE maintenance_notification_deliveries
  ALTER COLUMN first_attempted_at SET NOT NULL;

ALTER TABLE maintenance_notification_deliveries
  ADD CONSTRAINT maintenance_delivery_attempt_order
  CHECK (first_attempted_at <= attempted_at);
