process.env.JWT_SECRET = 'test-only-backend-suite-secret-at-least-32-bytes';
process.env.CUSTOMER_ENCRYPTION_CURRENT_KEY_ID = 'test-current';
process.env.CUSTOMER_ENCRYPTION_KEYS_JSON = JSON.stringify({
  'test-current': Buffer.alloc(32, 17).toString('base64'),
  'test-old': Buffer.alloc(32, 29).toString('base64'),
});
