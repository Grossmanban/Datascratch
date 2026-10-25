import { loadConfig } from '../config.js';
import { createDatabase, runMigrations } from './client.js';

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL, 1);
await runMigrations(database.pool);
await database.close();
console.log('migrations applied');
