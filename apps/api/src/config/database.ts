import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';

export function initializeDatabase(): Database.Database {
  mkdirSync(dirname(env.databasePath), { recursive: true });
  const database = new Database(env.databasePath);
  try {
    database.pragma('foreign_keys = ON');
    const schema = readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8');
    database.exec(schema);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
