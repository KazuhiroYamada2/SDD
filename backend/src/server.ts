import { createApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './db.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Backend is listening on port ${config.port}`);
});

let isShuttingDown = false;
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  server.close((error) => {
    void closeDatabase()
      .catch((cause: unknown) => {
        console.error('Failed to close the database pool.', cause);
        process.exitCode = 1;
      })
      .finally(() => {
        if (error !== undefined) {
          console.error('Failed to close the HTTP server.', error);
          process.exitCode = 1;
        }
      });
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
