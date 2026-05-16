import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { query } from '../db';
import pool from '../db';

async function main() {
  const [email] = process.argv.slice(2);

  if (!email) {
    console.error('Usage: npm run user:delete -- email@example.com');
    process.exit(1);
  }

  const result = await query(
    'SELECT id, name, email FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  if (!user) {
    console.error(`✗ No user found with email "${email}"`);
    process.exit(1);
  }

  console.log(`\n  Name:  ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  ID:    ${user.id}`);

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('\n  Delete this user? This will remove them from all projects. [y/N] ', async (answer) => {
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('  Cancelled.');
      await pool.end();
      return;
    }

    await query('DELETE FROM users WHERE id = $1', [user.id]);
    console.log(`\n✓ User "${user.name}" deleted\n`);
    await pool.end();
  });
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
