import { initializeDatabase } from '../config/database.js';

const database = initializeDatabase();
try {
  const insert = database.prepare('INSERT INTO employees (code, name) VALUES (?, ?) ON CONFLICT(code) DO NOTHING');
  database.transaction(() => {
    insert.run('EMP001', 'Empleado de prueba uno');
    insert.run('EMP002', 'Empleado de prueba dos');
  })();
  console.log('Test employees seeded.');
} finally {
  database.close();
}
