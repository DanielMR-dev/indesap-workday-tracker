import { createApp } from './app.js';
import { initializeDatabase } from './config/database.js';
import { env } from './config/env.js';

const database = initializeDatabase();
const server = createApp(database).listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
