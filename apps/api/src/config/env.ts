import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = fileURLToPath(new URL('../../../../', import.meta.url));
config({ path: resolve(rootDir, '.env'), quiet: true });

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

export const env = {
  port,
  databasePath: resolve(rootDir, process.env.DATABASE_PATH || 'data/workday.sqlite'),
};
