import { initializeDatabase } from '../config/database.js';

const database = initializeDatabase();
database.close();
console.log('SQLite schema initialized.');
