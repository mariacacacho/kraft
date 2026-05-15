import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import app from './app';
import pool from './db';
import { Migrator } from './db/migrator';

const PORT = process.env.PORT || 3001;

async function start() {
  const migrator = new Migrator(pool);
  await migrator.up();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
