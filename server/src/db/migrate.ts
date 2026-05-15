import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import pool from './index';
import { Migrator } from './migrator';

const migrator = new Migrator(pool);

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  try {
    switch (cmd) {
      case undefined:
      case 'up':
        await migrator.up();
        break;

      case 'down': {
        const steps = args[0] ? parseInt(args[0], 10) : 1;
        if (isNaN(steps) || steps < 1) {
          console.error('Usage: migrate down [steps]');
          process.exit(1);
        }
        await migrator.down(steps);
        break;
      }

      case 'status':
        await migrator.status();
        break;

      case 'create': {
        const name = args.join(' ');
        if (!name) {
          console.error('Usage: migrate create <name>');
          process.exit(1);
        }
        migrator.create(name);
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Usage: migrate [up|down [steps]|status|create <name>]');
        process.exit(1);
    }
  } catch (err) {
    console.error('\n✗ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
